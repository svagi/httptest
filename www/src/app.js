import { renderMarkup } from './router'
import bodyParser from 'body-parser'
// import createSSE from './sse'
import express from 'express'
import http from 'http'
import morgan from 'morgan'
import { isWebUri } from 'valid-url'

export const app = express()
const isProduction = app.get('env') !== 'development'

// Turn off extra header
app.disable('x-powered-by')

// An identical strong ETag guarantees the response is byte-for-byte the same
app.set('etag', 'strong')

// Setup custom morgan format
app.use(morgan(isProduction ? '[:date[iso]] :method :url :status HTTP/:http-version :response-time ms - ":user-agent"' : ' :method :url :status HTTP/:http-version :response-time ms - ":user-agent"'))

// Setup default JSON body parser and increase maximum limit
app.use(bodyParser.json({ limit: '20mb' }))

function createAnalyzeRequest (url) {
  const opts = {
    method: 'POST',
    host: process.env.API_HOST,
    port: process.env.API_PORT,
    path: '/analyze',
    headers: {
      'Content-Type': 'application/json'
    }
  }
  return new Promise((resolve, reject) => {
    const request = http.request(opts, (response) => {
      if (response.statusCode !== 200) {
        return reject({ status: 500 })
      }
      response.on('data', (data) => {
        const { id } = JSON.parse(data)
        if (!id) {
          return reject({ status: 500 })
        } else {
          return resolve({ status: 201, id: id })
        }
      })
    })
    request.on('error', (error) => {
      return reject({ status: 500, error: error })
    })
    request.end(JSON.stringify({
      url: url,
      hook: `http://www:${process.env.PORT}/pub`
    }))
  })
}

app.locals.sse = {}

// API subscriber
app.get('/sub', (req, res) => {
  const url = isWebUri(req.query.url)
  if (!url) {
    return res.status(400).end()
  }
  createAnalyzeRequest(url)
    .then((payload) => {
      const id = payload.id
      console.log('SSE: Creating', id)
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // turn off proxy buffering
      })
      app.locals.sse[id] = res
      res.on('close', () => {
        console.log('SSE: Deleting', id)
        delete app.locals.sse[id]
      })
      res.intervalId = setInterval(() => {
        res.write('id: ' + id + '\n')
        res.write('event: ping\n')
        res.write('data: \n\n')
      }, 30000) // 30s
      res.write('id: ' + id + '\n')
      res.write('event: analysis:start\n')
      res.write('data: \n\n')
    // keep connection open
    })
    .catch((err) => {
      console.log(err.message)
      // close connection
      res.status(500).end()
    })
})

// API publisher
app.post('/pub', (req, res) => {
  const data = req.body
  const prevRes = app.locals.sse[data.id]
  if (prevRes) {
    prevRes.write('id: ' + data.id + '\n')
    prevRes.write('event: ' + data.event + '\n')
    prevRes.write('data: ' + JSON.stringify(data) + '\n\n')
  }
  res.end()
})

app.get('*', (req, res) => {
  console.log('req.url: ', req.originalUrl)
  // TODO react-helmet for titles (https://github.com/nfl/react-helmet)
  const opts = {
    originalUrl: req.originalUrl,
    title: 'httptest'
  }
  renderMarkup(opts)
    .then(({ redirect, markup }) => {
      if (redirect) {
        res.redirect(302, redirect.pathname + redirect.search)
      } else {
        res.status(200).send(markup)
      }
    })
    .catch((err) => {
      console.log(err.stack)
      res.status(500).end()
    })
})
