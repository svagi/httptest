import http from 'http'
import Promise from 'bluebird'
import log from './debug'

const { COUCHDB_USER, COUCHDB_PASSWORD } = process.env

function request ({ body, ...options }) {
  const promise = new Promise((resolve, reject) => {
    const req = http.request(options, msg => {
      const headers = msg.headers
      let rawBody = ''
      msg.setEncoding('utf8')
      msg.on('data', chunk => {
        rawBody += chunk
      })
      msg.on('end', () => {
        resolve({
          ok: msg.statusCode < 400,
          status: {
            code: msg.statusCode,
            message: msg.statusMessage
          },
          headers: headers,
          rawBody: rawBody,
          body: JSON.parse(rawBody)
        })
      })
    })
    if (body) {
      req.write(JSON.stringify(body), 'utf-8')
    }
    req.end()
  })
  promise.then((result) => {
    log.debug(result.status)
    log.debug(result.headers)
    log.debug(result.body)
  })
  return promise
}

export default function initDB (opts = {}) {
  const defaults = {
    host: opts.host || 'db',
    port: opts.port || '5984',
    auth: opts.auth || `${COUCHDB_USER}:${COUCHDB_PASSWORD}`,
    agent: opts.agent || new http.Agent({ keepAlive: true })
  }
  return {
    createDatabase (db) {
      const dbPromise = request({ ...defaults, method: 'PUT', path: `/${db}` })
      return {
        async get (docId = '') {
          await dbPromise
          return request({
            ...defaults,
            method: 'GET',
            path: `/${db}/${encodeURIComponent(docId)}`
          })
        },
        async put (doc = {}) {
          await dbPromise
          return request({
            ...defaults,
            method: 'PUT',
            path: `/${db}/${encodeURIComponent(doc._id) || ''}`,
            body: doc
          })
        }
      }
    }
  }
}
