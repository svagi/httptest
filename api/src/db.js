import http from 'http'
import Promise from 'bluebird'
import log from './debug'

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
    host: opts.host || 'localhost',
    port: opts.port || '5984',
    auth: opts.auth,
    agent: opts.agent || new http.Agent({ keepAlive: true })
  }
  return {
    createDatabase (name) {
      const dbPromise = request({ ...defaults, method: 'PUT', path: `/${name}` })
      const db = {
        async get (docId = '') {
          await dbPromise
          return request({
            ...defaults,
            method: 'GET',
            path: `/${name}/${encodeURIComponent(docId)}`
          })
        },
        async put (doc = {}) {
          await dbPromise
          return request({
            ...defaults,
            method: 'PUT',
            path: `/${name}/${encodeURIComponent(doc._id || '')}`,
            body: doc
          })
        },
        async save (url, doc) {
          const { status, body } = await db.get(url)
          if (status.code === 200) {
            return db.put({ ...body, doc })
          } else {
            return db.put({ ...doc, _id: url })
          }
        }
      }
      return db
    }
  }
}
