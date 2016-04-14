import express from 'express'
import createSSE from './sse'
import { renderMarkup } from './router'
import debug from 'debug'
const log = debug('app')

export const app = express()

console.log(renderMarkup)

// Turn off extra header
app.disable('x-powered-by')

// An identical strong ETag guarantees the response is byte-for-byte the same
app.set('etag', 'strong')

app.use(express.static(__dirname))

// register SSE API as express middleware
app.use(function (req, res, next) {
  res.sse = createSSE(res)
  next()
})

app.get('/events', (req, res) => {
  res.sse.open()
  res.sse.emit('data', 'DATA\n')
  res.sse.close()
})

app.post('/events', (req, res) => {
  res.end()
})

app.get('*', (req, res) => {
  // TODO react-helmet for titles (https://github.com/nfl/react-helmet)
  renderMarkup({ location: req.url, title: 'httptest' })
    .then(({ redirect, markup }) => {
      if (redirect) {
        res.redirect(302, redirect.pathname + redirect.search)
      } else {
        res.status(200).end(markup)
      }
    })
    .catch((err) => {
      console.error(err)
      res.status(500).end()
    })
})
