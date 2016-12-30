import _ from 'pluralize'
import { isIP } from 'net'
import express from 'express'
import http from 'http'
import morgan from 'morgan'
import Redis from 'ioredis'
import { initStore } from './store'
import { accept, isResolvable } from './utils'
import { parseUrl } from './url'
import { renderServerRoute } from './pages/router'
import { events, sse } from './events'
import assets from '/api/build/assets.json'
import createModels from './models'
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
const { rankings, rateLimit } = createModels(cache)

// Turn off extra header
app.disable('x-powered-by')

// An identical strong ETag guarantees the response is byte-for-byte the same
app.set('etag', 'strong')

// Setup custom morgan format
app.use(morgan('[:date[iso]] :method :url :status HTTP/:http-version :response-time ms'))

// Start a new analysis
app.post('/api/analyses', accept('json'), async (req, res) => {
  // Check rate limits
  const ip = req.get('X-Real-IP') || req.ip
  const rate = 24
  const period = 86400 // 1 day
  const remaining = await rateLimit.check(ip, rate, period)
  res.set('X-RateLimit-Limit', rate)
  res.set('X-RateLimit-Remaining', Math.max(0, remaining - 1))
  if (!remaining) {
    return res.status(429).json({
      status: 'failed',
      error: 'API rate limit exceeded',
      message: `Sorry, you can create only ${_('analysis', rate, true)} per day.`
    })
  }
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
  // Check if url is already in the queue, if not push it to the queue
  const queue = await cache.lrange('queue', 0, 9)
  if (!queue.includes(url)) {
    cache.lpush('queue', url)
    cache.publish(events.QUEUE_PUSH, url)
  }
  res.status(202)
    .set({ Location: `/api/analyses?url=${encodeURIComponent(url)}` })
    .json({
      id: url,
      status: 'accepted'
    })
})

// Retrieve analysis
app.get('/api/analyses', accept('json'), async (req, res) => {
  // Set default Cache Policy – always revalidate
  res.set('Cache-Control', 'must-revalidate')
  // Parse URL
  const parsedUrl = parseUrl(req.query.url)
  if (!parsedUrl) {
    return res.status(400).json({
      error: 'Invalid URL address.',
      message: 'Please, use a valid URL address.'
    })
  }
  // Get analysis from the cache
  const url = parsedUrl.formatted
  const cacheKey = `analysis:${url}`
  const cacheAnalysis = await cache.get(cacheKey)
  if (cacheAnalysis) {
    res.type('json')
    res.send(cacheAnalysis)
    return cache.expire(cacheKey, TTL_ONE_WEEK) // refresh
  }
  // Start resolving hostname
  const hostname = parsedUrl.hostname
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
  if (dbAnalysis.status.ok) {
    res.type('json')
    res.set('Etag', dbAnalysis.headers.etag)
    res.send(dbAnalysis.body)
  } else {
    res.status(404).json({
      error: 'Not Found',
      message: 'Analysis was not found.'
    })
  }
})

// Global events
app.get('/api/events', accept('text/event-stream'), sse, async (req, res) => {
  // Open SSE connection
  const { emit } = res.sse.open()
  // Immediately emit all rankings
  const emitRankings = async () => {
    const { stringify } = JSON
    emit(events.RANKINS_LATEST, stringify(await rankings.getLatest()))
    emit(events.RANKINS_BEST, stringify(await rankings.getBest()))
    emit(events.RANKINS_WORST, stringify(await rankings.getWorst()))
    emit(events.RANKINS_TOTALS, stringify(await rankings.getTotals()))
  }
  emitRankings()
  // Register a new subscriber connection,
  // also quit subscriber if client or server close the connection
  const subscriber = cache.duplicate()
  req.on('close', () => subscriber.quit())
  res.on('finish', () => subscriber.quit())
  // Listen on global events
  subscriber.on('message', async (channel, message) => {
    switch (channel) {
      case events.ANALYSIS_START:
        return emit(events.ANALYSIS_START, message)
      case events.ANALYSIS_DONE:
        return emit(events.ANALYSIS_DONE, message)
      case events.ANALYSIS_ERROR:
        return emit(events.ANALYSIS_ERROR, message)
      case events.QUEUE_POP:
        return emit(events.QUEUE_POP, message)
      case events.QUEUE_PUSH:
        return emit(events.QUEUE_PUSH, message)
      case events.QUEUE_NEXT:
        return emitRankings()
    }
  })
  // Subscribe to all global events
  subscriber.subscribe(Object.values(events), (err) => {
    if (err) {
      log.error(err)
      emit('error')
      return res.end()
    }
    emit('subscribe')
  })
})

// Retrieve rankings
app.get('/api/rankings', accept('json'), async (req, res) => {
  const best = rankings.getBest()
  const latest = rankings.getLatest()
  const worst = rankings.getWorst()
  const totals = rankings.getTotals()
  res.set('Cache-Control', 'must-revalidate')
  res.json({
    best: await best,
    latest: await latest,
    worst: await worst,
    totals: await totals
  })
})

// Serve static files only in development
if (!PRODUCTION) {
  app.use(express.static('/api/static'))
}

// Render HTML
app.get('*', accept('html'), async (req, res) => {
  const { error, redirect, html, status } = await renderServerRoute({
    assets: assets,
    location: req.originalUrl,
    store: initStore()
  })
  if (error) {
    log.error(error)
    return res.status(500).end()
  }
  if (redirect) {
    return res.redirect(status, redirect.pathname + redirect.search)
  }
  res.status(status).type('html')
  // Can be cached for 30 mins
  res.set('Cache-Control', 'max-age=1800')
  // Server push hint (supported by cloudflare-nginx)
  res.set('Link', `</${assets.app.css}>; rel=preload; as=style;`)
  res.send(html)
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
  ttl: TTL_ONE_WEEK
})
worker.processQueue()
