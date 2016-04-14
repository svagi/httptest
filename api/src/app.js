import { generateHAR } from './selenium/firefox'
import { getProtocols } from './socket'
import bodyParser from 'body-parser'
import express from 'express'
import expressValidator from 'express-validator'
import morgan from 'morgan'
import parseUrl from 'url-parse'
import uuid from 'node-uuid'
import http from 'http'

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
    toURL: (value) => {
      const url = parseUrl(value)
      url.protocol = url.protocol || 'https:'
      return url
    }
  }
}))

// Routes
app.post('/har', (req, res) => {
  // Validation
  req.checkBody('url').isURL({ protocols: ['http', 'https'] })
  req.checkBody('hook').isURL({ protocols: ['http', 'https'] })
  req.sanitize('url').toURL()
  req.sanitize('hook').toURL()
  const errors = req.validationErrors()
  if (errors) {
    return res.status(400).send({
      success: false,
      errors: errors
    })
  }
  // Logic
  const { url, hook } = req.body
  const config = {
    url: url,
    id: uuid.v4(),
    dir: process.env.API_DATA_DIR,
    ext: '.har'
  }
  const harPromise = generateHAR(config)
  res.json({
    success: true,
    id: config.id
  })
  harPromise.then((har) => {
    const callback = http.request({
      method: 'POST',
      host: hook.hostname,
      port: hook.port,
      path: hook.pathname,
      headers: {
        'Content-Type': 'application/json'
      }
    })
    callback.on('error', (e) => {
      console.log(`problem with request: ${e.message}`)
    })
    callback.write(har)
    callback.end()
  }).catch((err) => {
    console.error(err)
    res.status(500).send()
  })
})

app.get('/protocols', (req, res) => {
  req.checkQuery('url').isURL({ protocols: ['http', 'https'] })
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
  req.checkQuery('url').isURL({ protocols: ['http', 'https'] })
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
