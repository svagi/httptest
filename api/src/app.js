import { generateHAR } from './selenium/firefox'
import { getProtocols } from './socket'
import bodyParser from 'body-parser'
import express from 'express'
import expressValidator from 'express-validator'
import morgan from 'morgan'
import url from 'url'
import uuid from 'node-uuid'
import http from 'http'
import analyze from './analysis/analyze'

export const app = express()
const isProduction = app.get('env') !== 'development'

// Turn off extra header
app.disable('x-powered-by')

// An identical strong ETag guarantees the response is byte-for-byte the same
app.set('etag', 'strong')

// Setup custom morgan format
app.use(morgan(isProduction ? '[:date[iso]] :method :url :status HTTP/:http-version :response-time ms - ":user-agent"' : ' :method :url :status HTTP/:http-version :response-time ms - ":user-agent"'))

app.use(bodyParser.json())
app.use(expressValidator({
  customValidators: {
    isArray: (value) => Array.isArray(value)
  },
  customSanitizers: {
    toURL: (value) => url.parse(value)
  }
}))

function webhook (options, payload) {
  const data = JSON.stringify(payload)
  return new Promise((resolve, reject) => {
    const callback = http.request(options)
    callback.on('error', reject)
    callback.end(data, resolve)
  })
}

// Routes
app.post('/analyze', (req, res) => {
  // Validation
  req.checkBody('url').notEmpty()
  req.checkBody('hook').notEmpty()
  req.sanitize('url').toURL()
  req.sanitize('hook').toURL()
  const errors = req.validationErrors()
  if (errors) {
    return res.status(400).send({ errors: errors })
  }
  // Send response with HAR ID immediately
  const id = uuid.v4()
  res.json({ id: id })
  // Setup
  const { url, hook } = req.body
  const harOpts = {
    url: url.href,
    hostname: url.hostname,
    id: id,
    dir: process.env.API_DATA_DIR,
    ext: '.har'
  }
  const hookOpts = {
    method: 'POST',
    host: hook.hostname,
    port: hook.port,
    path: hook.pathname,
    headers: {
      'Last-Event-ID': id,
      'Content-Type': 'application/json'
    }
  }
  // Start generating HAR file
  generateHAR(harOpts)
    .then((har) => {
      hookOpts.headers['Last-Event'] = 'analysis:done'
      webhook(hookOpts, {
        host: url.hostname,
        analysis: analyze(har),
        har: har,
        error: null
      })
    })
    .catch((err) => {
      hookOpts.headers['Last-Event'] = 'analysis:error'
      webhook(hookOpts, {
        host: url.hostname,
        analysis: null,
        har: null,
        error: err.message
      })
    })
})

app.get('/protocols', (req, res) => {
  req.checkQuery('url').notEmpty()
  req.checkQuery('protocols').optional().isArray()
  req.sanitizeQuery('url').toURL()
  const errors = req.validationErrors()
  if (errors) {
    return res.status(400).send({ errors: errors })
  } else {
    return getProtocols(req.query.url.hostname, req.query.protocols)
      .then((result) => res.send(result))
  }
})

app.post('/protocols', (req, res) => {
  req.checkQuery('url').notEmpty()
  req.sanitize('url').toURL()
  req.check('protocols').optional().isArray()
  const errors = req.validationErrors()
  if (errors) {
    return res.status(400).send({ errors: errors })
  } else {
    return getProtocols(req.body.url.hostname, req.body.protocols)
      .then((result) => res.send(result))
  }
})
