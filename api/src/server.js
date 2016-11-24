import { isWebUri } from 'valid-url'
import express from 'express'
import http from 'http'
import morgan from 'morgan'
import Redis from 'ioredis'
import etag from 'etag'

import { renderServerRoute } from './pages/router'
import log from './debug'
import createWorker from './worker'
import { createRankings } from './model'

const app = express()
const ENV = process.env.NODE_ENV
const PORT = process.env.NODE_PORT
const IS_DEV = ENV !== 'development'
const cache = new Redis({
  host: 'cache',
  showFriendlyErrorStack: IS_DEV
})
const rankings = createRankings(cache)

function validUrlMiddleware (req, res, next) {
  req.query.url = isWebUri(req.query.url)
  if (!req.query.url) {
    return res.status(400).end()
  }
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
  // res.socket.setTimeout(Number.MAX_VALUE) // last as long as possible
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

// Setup custom morgan format
app.use(morgan('[:date[iso]] :method :url :status HTTP/:http-version :response-time ms'))

// Retrieve analysis
app.get('/analysis', (req, res) => {
  return cache.get('analysis:' + req.query.url)
    .then(analysis => {
      // analysis exists in cache
      if (analysis) {
        return res.status(200).end(analysis)
      } else {
        return res.status(404).end()
      }
    })
    .catch(err => {
      log.error(err)
      return res.status(500).end()
    })
})

// Delete analysis
app.delete('/analysis', validUrlMiddleware, (req, res) => {
  return cache.del('analysis:' + req.query.url)
    .then(() => {
      return res.status(200).end()
    })
    .catch(err => {
      log.error(err)
      return res.status(500).end()
    })
})

app.get('/events', validUrlMiddleware, sseMiddleware, (req, res) => {
  if (!req.accepts('text/event-stream')) {
    return res.status(406).end()
  }
  const { url, purge } = req.query
  const useCache = typeof purge === 'undefined'
  // Open SSE connection
  const sse = res.sse.open()
  // Define URL specific events
  const events = {
    ANALYSIS_DONE: `analysis-done:${url}`,
    ANALYSIS_START: `analysis-start:${url}`,
    ANALYSIS_ERROR: `analysis-error:${url}`,
    HAR_DONE: `har-done:${url}`,
    HAR_START: `har-start:${url}`,
    QUEUE_POP: 'queue-pop',
    QUEUE_PUSH: 'queue-push'
  }
  // Register new redis connection
  const subscriber = cache.duplicate()
  // Quit subscriber if client or server close connection
  req.on('close', () => subscriber.quit())
  res.on('finish', () => subscriber.quit())
  // Listen on events
  subscriber.on('message', (channel, message) => {
    switch (channel) {
      case events.HAR_START:
        sse.emit('har-start')
        return
      case events.HAR_DONE:
        sse.emit('har-done')
        return
      case events.ANALYSIS_START:
        sse.emit('analysis-start')
        return
      case events.ANALYSIS_DONE:
        sse.emit('analysis-done', message)
        res.end()
        return
      case events.ANALYSIS_ERROR:
        sse.emit('analysis-error')
        res.end()
        return
      case events.QUEUE_PUSH:
        sse.emit('queue-push', message)
        return
      case events.QUEUE_POP:
        sse.emit('queue-pop')
        return
    }
  })
  // Subscribe to all events
  subscriber.subscribe(Object.values(events), (err) => {
    if (err) {
      log.error(err)
      sse.emit('error')
      return res.end()
    }
    sse.emit('subscribe')
    cache.get(`analysis:${url}`)
      .then((analysis) => {
        if (useCache && analysis) {
          return cache.publish(events.ANALYSIS_DONE, analysis)
        } else {
          return cache.lpush('queue', url)
            .then((count) => cache.publish(events.QUEUE_PUSH, count))
        }
      })
      .catch((err) => {
        log.error(err)
        sse.emit('error')
        res.end()
      })
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
    res.write('\"latest\":' + stringify(await latest) + ',')
    res.write('\"best\":' + stringify(await best) + ',')
    res.write('\"worst\":' + stringify(await worst) + ',')
    res.write('\"totals\":' + stringify(await totals))
    res.write('}')
    res.end()
  }
})

app.get('*', async (req, res) => {
  const props = { location: req.originalUrl }
  const { redirect, html } = await renderServerRoute(props).catch(err => {
    log.error(err)
    res.status(500).end()
  })
  if (redirect) {
    res.redirect(302, redirect.pathname + redirect.search)
  } else {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': Buffer.byteLength(html, 'utf-8'),
      'Cache-Control': 'no-cache',
      // Server push hints (supported by cloudflare-nginx)
      // https://w3c.github.io/preload/
      'Link': [
        '</app.bundle.css>; rel=preload; as=style;',
        '</init.bundle.js>; rel=preload; as=script;'
      ],
      'Etag': etag(html)
    })
    res.end(html)
  }
})

// Start server
http.createServer(app).listen(PORT, () => {
  log.info('Server running on port %d in %s mode...', PORT, ENV)
})

// Start worker
const worker = createWorker({
  cache: cache.duplicate(),
  rankings: rankings,
  chromeConfig: {
    host: 'chrome',
    port: 9222,
    fetchContent: true
  },
  interval: 500,
  ttl: 60 * 60 * 24 * 7 // 1 week
})
worker.processQueue()
