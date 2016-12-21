import { isIP } from 'net'
import etag from 'etag'
import express from 'express'
import http from 'http'
import morgan from 'morgan'
import Redis from 'ioredis'
import { createRankings } from './model'
import { initStore } from './store'
import { isResolvable } from './utils'
import { parseUrl } from './url'
import { renderServerRoute } from './pages/router'
import { accept, sseMiddleware } from './middleware'
import assets from '/api/build/assets.json'
import createWorker from './worker'
import initDB from './db'
import log from './debug'
import pkg from '../package.json'

const { COUCHDB_USER, COUCHDB_PASSWORD, NODE_ENV, NODE_PORT } = process.env
const PRODUCTION = NODE_ENV === 'production'
const TTL_ONE_WEEK = 60 * 60 * 24 * 7
const app = express()
const cache = new Redis({
  host: 'cache',
  showFriendlyErrorStack: !PRODUCTION,
  dropBufferSupport: true
})
const db = initDB({
  host: 'db',
  auth: `${COUCHDB_USER}:${COUCHDB_PASSWORD}`
})
const analyses = db.createDatabase('analyses')
const rankings = createRankings(cache)

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

// Start a new analysis
app.post('/analyses', accept('application/json'), async (req, res) => {
  const parsedUrl = parseUrl(req.query.url)
  if (!parsedUrl) {
    return res.status(400).json({
      error: 'Invalid URL address.',
      message: 'Please, use a valid URL address.'
    })
  }
  const url = parsedUrl.formatted
  const hostname = parsedUrl.hostname
  // Check if hostname is IP address
  if (isIP(hostname)) {
    return res.status(400).json({
      status: 'failed',
      error: 'Invalid URL address.',
      message: 'Sorry, IP addresses are not supported. Please, use domain name instead.'
    })
  }
  // Check if hostname is resolvable
  if (!await isResolvable(hostname)) {
    return res.status(400).json({
      status: 'failed',
      error: 'Invalid URL address.',
      message: `Sorry, domain (${hostname}) could not be resolved.`
    })
  }
  // Check if url is already in the queue
  const queue = await cache.lrange('queue', 0, 9)
  if (!queue.includes(url)) {
    // Add url to the queue
    cache.lpush('queue', url)
    cache.publish('queue-push', url)
  }
  res.status(202)
    .set({ Location: `/analyses?url=${encodeURIComponent(url)}` })
    .json({
      id: url,
      status: 'accepted'
    })
})

// Retrieve analysis
app.get('/analyses', accept('application/json'), async (req, res) => {
  // Get analysis from the cache
  const queryUrl = req.query.url
  const cacheKey = `analysis:${queryUrl}`
  const cacheAnalysis = await cache.get(cacheKey)
  if (queryUrl && cacheAnalysis) {
    res.type('json')
    res.send(cacheAnalysis)
    return cache.expire(cacheKey, TTL_ONE_WEEK) // refresh
  }
  // Parse URL
  const parsedUrl = parseUrl(queryUrl)
  if (!parsedUrl) {
    return res.status(400).json({
      error: 'Invalid URL address.',
      message: 'Please, use a valid URL address.'
    })
  }
  const url = parsedUrl.formatted
  const hostname = parsedUrl.hostname
  // Start resolving hostname
  const isResolvablePromise = isResolvable(hostname)
  // Check if hostname is IP address
  if (isIP(hostname)) {
    return res.status(400).json({
      error: 'Invalid URL address.',
      message: 'Sorry, IP addresses are not supported. Please, use domain name instead.'
    })
  }
  // Check if hostname is resolvable
  if (!await isResolvablePromise) {
    return res.status(400).json({
      error: 'Invalid URL address.',
      message: `Sorry, domain (${hostname}) could not be resolved.`
    })
  }
  // Get analysis from the database
  const dbAnalysis = await analyses.get(url)
  if (dbAnalysis.ok) {
    res.type('json')
    res.set('Etag', dbAnalysis.headers.etag)
    res.send(dbAnalysis.body)
    return res.end()
  }
  res.status(404).json({
    error: 'Not Found',
    message: 'Analysis was not found.'
  })
})

// Global events
app.get('/events', sseMiddleware, async (req, res) => {
  if (!req.accepts('text/event-stream')) {
    return res.status(406).end()
  }
  const { stringify } = JSON
  // const useCache = typeof req.query.purge === 'undefined'
  const events = {
    ANALYSIS_START: `analysis-start`,
    ANALYSIS_DONE: `analysis-done`,
    ANALYSIS_ERROR: `analysis-error`,
    QUEUE_POP: 'queue-pop',
    QUEUE_PUSH: 'queue-push',
    QUEUE_NEXT: 'queue-next'
  }
    // Open SSE connection
  const sse = res.sse.open()
  const emitRankings = async () => {
    sse.emit('rankings-latest', stringify(await rankings.getLatest()))
    sse.emit('rankings-best', stringify(await rankings.getBest()))
    sse.emit('rankings-worst', stringify(await rankings.getWorst()))
    sse.emit('rankings-totals', stringify(await rankings.getTotals()))
  }
  emitRankings()
  // Register new redis connection
  const subscriber = cache.duplicate()
  // Quit subscriber if client or server close connection
  req.on('close', () => subscriber.quit())
  res.on('finish', () => subscriber.quit())
  // Listen on global events
  subscriber.on('message', async (channel, message) => {
    switch (channel) {
      case events.ANALYSIS_START:
        return sse.emit(events.ANALYSIS_START, message)
      case events.ANALYSIS_DONE:
        return sse.emit(events.ANALYSIS_DONE, message)
      case events.ANALYSIS_ERROR:
        return sse.emit('analysis-error', message)
      case events.QUEUE_POP:
        sse.emit(events.QUEUE_POP, message)
        return
      case events.QUEUE_PUSH:
        return sse.emit(events.QUEUE_PUSH, message)
      case events.QUEUE_NEXT:
        return emitRankings()
    }
  })
  // Subscribe to all events
  subscriber.subscribe(Object.values(events), async (err) => {
    if (err) {
      log.error(err)
      sse.emit('error')
      return res.end()
    }
    sse.emit('subscribe')
  })
})

// Retrieve rankings
app.get('/rankings', async (req, res) => {
  if (!req.accepts('application/json')) {
    return res.status(406).end()
  }
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  })
  res.end(JSON.stringify(await rankings.getAll()))
})

app.get('*', async (req, res) => {
  const store = initStore()
  const props = { assets, location: req.originalUrl, store: store }
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
    'Link': `</${assets.app.css}>; rel=preload; as=style;`,
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
