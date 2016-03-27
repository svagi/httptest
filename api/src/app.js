import { generateHAR } from './selenium/firefox'
import { getProtocols } from './socket'
import bodyParser from 'body-parser'
import express from 'express'
import expressValidator from 'express-validator'
import morgan from 'morgan'
import parseUrl from 'url-parse'

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
app.get('/har', (req, res) => {
  req.checkQuery('url').isURL({ protocols: ['http', 'https'] })
  req.checkQuery('protocols').optional().isArray()
  req.sanitizeQuery('url').toURL()
  const errors = req.validationErrors()
  if (errors) return res.status(400).send({ errors: errors })
  return generateHAR(req.query.url.toString())
    // Send HAR as JSON response
    .then((data) => res.send(data))
    // Error handler
    .catch((err) => {
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
