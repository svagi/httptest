import express from 'express'
import morgan from 'morgan'
import { version } from '../package.json'

export const app = express()
const isProduction = app.get('env') !== 'development'

// Turn off extra header
app.disable('x-powered-by')

// An identical strong ETag guarantees the response is byte-for-byte the same
app.set('etag', 'strong')

// Setup custom morgan format
app.use(morgan(isProduction
  ? '[:date[iso]] :method :url :status HTTP/:http-version :response-time ms - ":user-agent"'
  : ' :method :url :status HTTP/:http-version :response-time ms - ":user-agent"'
))

// Routes
app.get('/', (req, res) => {
  res.send(`httptest ${version}`)
})
