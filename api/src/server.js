import { isIP } from 'net'
import { isWebUri } from 'valid-url'
import dns from 'dns'
import etag from 'etag'
import express from 'express'
import http from 'http'
import morgan from 'morgan'
import Redis from 'ioredis'

import { createRankings } from './model'
import { parseUrl } from './url'
import { renderServerRoute } from './pages/router'
import initDB from './db'
import createWorker from './worker'
import log from './debug'
import pkg from '../package.json'
import assets from '/api/build/assets.json'

const { NODE_ENV, NODE_PORT } = process.env
const PRODUCTION = NODE_ENV === 'production'
const TTL_ONE_WEEK = 60 * 60 * 24 * 7
const app = express()
const cache = new Redis({
  host: 'cache',
  showFriendlyErrorStack: !PRODUCTION,
  dropBufferSupport: true
})
const db = initDB()
const analyses = db.createDatabase('analyses')
const rankings = createRankings(cache)

function isResolvable (hostname) {
  return new Promise(resolve => dns.lookup(hostname, err => resolve(!err)))
}

function validUrlMiddleware (req, res, next) {
  const url = isWebUri(req.query.url)
  if (!url) {
    return res.status(400).end()
  }
  const parsedUrl = parseUrl(url)
  res.locals.url = parsedUrl.formatted
  res.locals.parsedUrl = parsedUrl
  next()
}

function sseMiddleware (req, res, next) {
  if (!req.accepts('text/event-stream')) {
    return next()
  }
  const TIMEOUT = 15 * 1000
  let lastId
  let timer
  req.on('close', function () {
    log.debug('SSE: Client close connection')
    timer = clearTimeout(timer)
  })
  res.on('finish', function () {
    log.debug('SSE: Server finish connection')
    timer = clearTimeout(timer)
  })
  const sse = res.sse = {
    open () {
      lastId = 0
      timer = setTimeout(sse.ping, TIMEOUT)
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // turn off proxy buffering
      })
      sse.emit('open')
      return sse
    },
    emit (event = 'message', data = 'null') {
      log.debug(`SSE: emit -> ${lastId}:${event}`)
      res.write('id: ' + lastId++ + '\n')
      res.write('event: ' + event + '\n')
      res.write('data: ' + data + '\n\n')
      return sse
    },
    ping () {
      sse.emit('ping')
      timer = setTimeout(sse.ping, TIMEOUT)
      return sse
    }
  }
  next()
}

// Turn off extra header
app.disable('x-powered-by')

// An identical strong ETag guarantees the response is byte-for-byte the same
app.set('etag', 'strong')

// Serve static files only in development
if (!PRODUCTION) {
  app.use(express.static('/api/static'))
}

// Setup custom morgan format
app.use(morgan('[:date[iso]] :method :url :status HTTP/:http-version :response-time ms'))

// Retrieve analysis
app.get('/analysis', validUrlMiddleware, async (req, res) => {
  let analysis
  try {
    analysis = await cache.get('analysis:' + res.locals.url)
  } catch (err) {
    log.error(err)
    res.status(500).end()
  }
  if (analysis) {
    res.status(200).json(analysis)
  } else {
    res.status(404).end()
  }
})

app.get('/events', validUrlMiddleware, sseMiddleware, async (req, res) => {
  if (!req.accepts('text/event-stream')) {
    return res.status(406).end()
  }
  const query = req.query
  const purge = query.purge
  const url = res.locals.url
  const parsedUrl = res.locals.parsedUrl
  const hostname = parsedUrl.hostname
  const useCache = typeof purge === 'undefined'
  const events = {
    ANALYSIS_DONE: `analysis-done:${url}`,
    ANALYSIS_START: `analysis-start:${url}`,
    ANALYSIS_ERROR: `analysis-error:${url}`,
    HAR_DONE: `har-done:${url}`,
    HAR_START: `har-start:${url}`,
    QUEUE_POP: 'queue-pop'
  }
  // Open SSE connection
  const sse = res.sse.open()
  // Check if something already exists in cache or database
  if (useCache) {
    // Get analysis from the cache
    const cacheKey = `analysis:${url}`
    const cacheAnalysis = await cache.get(cacheKey)
    if (cacheAnalysis) {
      sse.emit('analysis-done', cacheAnalysis)
      cache.expire(cacheKey, TTL_ONE_WEEK) // refresh
      return res.end()
    }
    // Get analysis from the database
    const dbAnalysis = await analyses.get(url)
    if (dbAnalysis.ok) {
      sse.emit('analysis-done', dbAnalysis.rawBody)
      return res.end()
    }
  }
  // Check if hostname is IP address
  if (isIP(hostname)) {
    sse.emit('error', 'Sorry, IP addresses are not supported. Please, use domain name instead.')
    return res.end()
  }
  // Check if hostname is resolvable
  if (!await isResolvable(hostname)) {
    sse.emit('error', `Sorry, hostname (${hostname}) could not be resolved.`)
    return res.end()
  }
  // Register new redis connection
  const subscriber = cache.duplicate()
  // Quit subscriber if client or server close connection
  req.on('close', () => subscriber.quit())
  res.on('finish', () => subscriber.quit())
  // Listen on global events
  subscriber.on('message', (channel, message) => {
    switch (channel) {
      case events.HAR_START:
        return sse.emit('har-start')
      case events.HAR_DONE:
        return sse.emit('har-done')
      case events.ANALYSIS_START:
        return sse.emit('analysis-start')
      case events.ANALYSIS_DONE:
        sse.emit('analysis-done', message)
        return res.end()
      case events.ANALYSIS_ERROR:
        sse.emit('error', message)
        return res.end()
      case events.QUEUE_POP:
        return sse.emit('queue-pop')
    }
  })
  // Subscribe to all events
  subscriber.subscribe(Object.values(events), async (err) => {
    if (err) {
      log.error(err)
      sse.emit('error')
      return res.end()
    }
    // Generate analysis
    sse.emit('subscribe', url)
    const count = await cache.lpush('queue', url)
    sse.emit('queue-push', count)
  })
})

app.get('/rankings', sseMiddleware, async (req, res) => {
  const accepts = req.accepts(['application/json', 'text/event-stream'])
  if (!accepts) {
    return res.status(406).end()
  }
  const latest = rankings.getLatest()
  const best = rankings.getBest()
  const worst = rankings.getWorst()
  const totals = rankings.getTotals()
  const { stringify } = JSON
  if (accepts === 'text/event-stream') {
    const sse = res.sse
    sse.open()
    sse.emit('latest', stringify(await latest))
    sse.emit('best', stringify(await best))
    sse.emit('worst', stringify(await worst))
    sse.emit('totals', stringify(await totals))
    // Register new redis connection
    const subscriber = cache.duplicate()
    // Quit subscriber if client or server close connection
    req.on('close', () => subscriber.quit())
    res.on('finish', () => subscriber.quit())
    subscriber.subscribe('queue-next', (err) => {
      if (err) {
        log.error(err)
        sse.emit('error')
        res.end()
      }
    })
    subscriber.on('message', async (channel, message) => {
      if (channel === 'queue-next') {
        sse.emit('latest', stringify(await rankings.getLatest()))
        sse.emit('best', stringify(await rankings.getBest()))
        sse.emit('worst', stringify(await rankings.getWorst()))
        sse.emit('totals', stringify(await rankings.getTotals()))
      }
    })
  } else {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no' // turn off proxy buffering
    })
    res.write('{')
    res.write('"latest":' + stringify(await latest) + ',')
    res.write('"best":' + stringify(await best) + ',')
    res.write('"worst":' + stringify(await worst) + ',')
    res.write('"totals":' + stringify(await totals))
    res.write('}')
    res.end()
  }
})

app.get('*', async (req, res) => {
  const props = { assets, location: req.originalUrl }
  const { error, redirect, html, status } = await renderServerRoute(props)
  if (error) {
    log.error(error)
    return res.status(500).end()
  }
  if (redirect) {
    return res.redirect(status, redirect.pathname + redirect.search)
  }
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html, 'utf-8'),
    'Cache-Control': 'max-age=180, must-revalidate',
    // Server push hints (supported by cloudflare-nginx)
    // https://w3c.github.io/preload/
    'Link': [
      `</${assets.app.css}>; rel=preload; as=style;`,
      `</${assets.init.js}>; rel=preload; as=script;`
    ],
    'Etag': etag(html)
  })
  res.end(html)
})

// Start server
http.createServer(app).listen(NODE_PORT, () => {
  log.info('Server running on port %d in %s mode...', NODE_PORT, NODE_ENV)
})

// Start worker
const worker = createWorker({
  cache: cache.duplicate(),
  analyses: analyses,
  rankings: rankings,
  verbose: !PRODUCTION,
  chromeConfig: {
    host: 'chrome',
    port: 9222,
    userAgent: `Mozilla/5.0 (compatible; ${pkg.name}/${pkg.version}; +${pkg.homepage}) HeadlessChrome`,
    onLoadDelay: 2000,
    fetchContent: true,
    giveUpTime: 90 // sec
  },
  interval: 500,
  ttl: TTL_ONE_WEEK
})
worker.processQueue()
