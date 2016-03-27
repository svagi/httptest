import { getProtocols } from './socket'
import { readFile as readFileNode } from 'fs'
import { watch } from 'chokidar'
import bodyParser from 'body-parser'
import express from 'express'
import expressValidator from 'express-validator'
import firefox from 'selenium-webdriver/firefox'
import morgan from 'morgan'
import parseUrl from 'url-parse'
import Promise from 'bluebird'
import uuid from 'node-uuid'
import webdriver from 'selenium-webdriver'

export const app = express()
const isProduction = app.get('env') !== 'development'
const readFile = Promise.promisify(readFileNode)

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
  if (errors) {
    return res.status(400).send({ errors: errors })
  }
  const url = req.query.url.toString()
  const id = uuid.v4()
  const directory = process.env.API_HAR_DIR
  const watcher = watch(directory + id + '.har')
  const profile = new firefox.Profile()
  profile.setPreference('app.update.enabled', false)
  profile.setPreference('devtools.toolbar.enabled', true)
  profile.setPreference('devtools.cache.disabled', true)
  profile.setPreference('network.dnsCacheExpiration', 0)
  profile.setPreference('devtools.netmonitor.enabled', true)
  profile.setPreference('devtools.netmonitor.har.defaultFileName', id)
  profile.setPreference('devtools.netmonitor.har.enableAutoExportToFile', true)
  profile.setPreference('devtools.netmonitor.har.includeResponseBodies', false)
  profile.setPreference('devtools.netmonitor.har.pageLoadedTimeout', 100)
  profile.setPreference('devtools.netmonitor.har.defaultLogDir', directory)
  const options = new firefox.Options()
    .setProfile(profile)
  const driver = new webdriver.Builder()
    .forBrowser('firefox', '45.1')
    .setFirefoxOptions(options)
    .build()
  driver.actions()
    // Open devtools with ctrl+shift+q (needed for HAR export)
    .keyDown(webdriver.Key.CONTROL)
    .keyDown(webdriver.Key.SHIFT)
    .sendKeys('q')
    .keyUp(webdriver.Key.SHIFT)
    .keyUp(webdriver.Key.CONTROL)
    .perform()
    // Open url
    .then(() => driver.get(url))
    // Wait for exported HAR file
    .then(() => new Promise((resolve, reject) => {
      watcher
        .on('add', resolve)
        .on('error', reject)
    }))
    // Read HAR from disk
    .then(readFile)
    // Send HAR as JSON response
    .then((data) => res.send(data))
    // Cleanup
    .then(() => {
      watcher.close()
      driver.quit()
    })
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
