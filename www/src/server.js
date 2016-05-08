import { renderServerRoute } from './pages/router'
import bodyParser from 'body-parser'
import express from 'express'
import http from 'http'
import morgan from 'morgan'
import { isWebUri } from 'valid-url'

export const app = express()
const isProduction = app.get('env') !== 'development'
const port = parseInt(process.env.PORT, 10)

// Turn off extra header
app.disable('x-powered-by')

// An identical strong ETag guarantees the response is byte-for-byte the same
app.set('etag', 'strong')

// Setup custom morgan format
app.use(morgan(isProduction ? '[:date[iso]] :method :url :status HTTP/:http-version :response-time ms - ":user-agent"' : ' :method :url :status HTTP/:http-version :response-time ms - ":user-agent"'))

function createAnalysisRequest (url) {
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
      hook: `http://www:${process.env.PORT}/pubsub`
    }))
  })
}

// Global object of SSE connections
app.locals.sse = {}

// Setup default body parser and increase maximum limit
app.use('/pubsub', bodyParser.text({ type: 'application/json', limit: '20mb' }))

// Custom middleware for SSE emit extension
app.use('/pubsub', (req, res, next) => {
  res.sse = {
    getConnection: function (id) {
      return app.locals.sse[id]
    },
    setConnection: function (id) {
      app.locals.sse[id] = res
    },
    open: function (id, opts = { ping: 30000 }) {
      this.setConnection(id)
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // turn off proxy buffering
      })
      this.interval = setInterval(() => this.emit(id, 'ping'), opts.ping)
      res.on('close', () => {
        this.close(id)
      })
    },
    emit: function (id, event, data = '') {
      console.log('SSE: emit ->', event)
      res.write('id: ' + id + '\n')
      if (event) res.write('event:' + event + '\n')
      res.write('data:' + data + '\n\n')
    },
    close: function (id) {
      console.log('SSE: close ->', id)
      clearInterval(this.interval)
      delete app.locals.sse[id]
    }
  }
  next()
})

// API subscriber
app.get('/pubsub', (req, res) => {
  const url = isWebUri(req.query.url)
  if (!url) {
    return res.status(400).end()
  }
  createAnalysisRequest(url)
    // on success keep SSE connection open
    .then(({ id }) => {
      res.sse.open(id)
      res.sse.emit(id, 'analysis:start')
    })
    // on failure close SSE connection
    .catch((err) => {
      console.log(err.message)
      res.status(500).end()
    })
})

// API publisher
app.post('/pubsub', (req, res) => {
  const id = req.get('Last-Event-ID')
  if (!id) {
    res.status(400).end()
  }
  const event = req.get('Last-Event')
  const connRes = res.sse.getConnection(id)
  if (connRes) {
    connRes.sse.emit(id, event, req.body)
  }
  res.end()
})

app.get('*', (req, res) => {
  renderServerRoute({ location: req.originalUrl })
    .then(({ redirect, html }) => {
      if (redirect) {
        res.redirect(302, redirect.pathname + redirect.search)
      } else {
        // Server push hints (supported by cloudflare-nginx)
        // https://w3c.github.io/preload/
        // TODO move logic somewhere else?
        res.header('Link', [
          '</static/pure.min.css>; rel=preload; as=style;',
          '</static/bundle.css>; rel=preload; as=style;'
        ])
        res.status(200).send(html)
      }
    })
    .catch((err) => {
      console.log(err.stack)
      res.status(500).end()
    })
})

export const server = app.listen(port, () => {
  console.log('Server running on port ' + port)
})
