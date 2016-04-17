import { renderMarkup } from './router'
import bodyParser from 'body-parser'
// import createSSE from './sse'
import express from 'express'
// import http from 'http'
import morgan from 'morgan'

export const app = express()
const isProduction = app.get('env') !== 'development'

// Turn off extra header
app.disable('x-powered-by')

// An identical strong ETag guarantees the response is byte-for-byte the same
app.set('etag', 'strong')

// Setup custom morgan format
app.use(morgan(isProduction ? '[:date[iso]] :method :url :status HTTP/:http-version :response-time ms - ":user-agent"' : ' :method :url :status HTTP/:http-version :response-time ms - ":user-agent"'))

app.use(bodyParser.json())

// Create SSE middleware
// const sse = createSSE(app)
// app.post('/analyze', (req, res) => {
//   if (!req.query.url) {
//     return res.status(400).end()
//   }
//   // API Request
//   const opts = {
//     method: 'POST',
//     host: process.env.API_HOST,
//     port: process.env.API_PORT,
//     path: process.env.API_PATH,
//     headers: {
//       'Content-Type': 'application/json'
//     }
//   }
//   const request = http.request(opts, (response) => {
//     if (response.statusCode !== 200) {
//       return res.status(400).end()
//     }
//     response.on('data', (data) => {
//       const { id } = JSON.parse(data)
//       if (!id) {
//         return res.status(500).end()
//       } else {
//         return res
//           .status(201)
//           .header('Location', '/sub?id=' + id)
//           .end()
//       }
//     })
//   })
//   request.on('error', () => {
//     return res.status(500).end()
//   })
//   request.end(JSON.stringify({
//     url: req.query.url,
//     hook: `http://www:${process.env.PORT}/pub`
//   }))
// })
//
// // SSE sockets
// app.locals.sse = {}
//
// // SSE subscriber
// app.get('/sub', sse, (req, res) => {
//   res.writeHead(200, {
//     'Content-Type': 'text/event-stream',
//     'Cache-Control': 'no-cache',
//     'Connection': 'keep-alive'
//   })
// })
//
// // SSE publisher
// app.post('/pub', sse, (req, res) => {
//   const payload = req.body
//   const resSSE = res.getSSE(payload.id)
//   if (resSSE && payload.event && payload.data) {
//     resSSE.emit(payload.event, JSON.stringify(payload.data))
//     resSSE.end()
//     res.status(200).end()
//   } else {
//     res.status(400).end()
//   }
// })

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
    .catch(() => {
      res.status(500).end()
    })
})
