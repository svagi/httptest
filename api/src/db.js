import http from 'http'
import Promise from 'bluebird'
import log from './debug'

function request ({ body, encoding = 'utf-8', ...options }) {
  const promise = new Promise((resolve, reject) => {
    const req = http.request(options, msg => {
      const { statusCode } = msg
      let rawBody = ''
      msg.setEncoding(encoding)
      msg.on('data', chunk => {
        rawBody += chunk
      })
      msg.on('end', () => {
        resolve({
          status: {
            ok: statusCode < 400,
            code: statusCode,
            message: msg.statusMessage
          },
          headers: msg.headers,
          body: rawBody
        })
      })
    })
    req.on('error', reject)
    if (body) {
      req.write(body, encoding)
    }
    req.end()
  })
  promise.then(log.debug)
  return promise
}

export default function initDB (opts = {}) {
  const defaults = {
    host: opts.host || 'localhost',
    port: opts.port || '5984',
    auth: opts.auth,
    agent: opts.agent || new http.Agent({ keepAlive: true }),
    headers: {
      Accept: 'application/json'
    }
  }
  return {
    createDatabase (name) {
      const db = {
        promise: request({
          ...defaults,
          method: 'PUT',
          path: `/${name}`
        }),
        get (docId = '') {
          return request({
            ...defaults,
            method: 'GET',
            path: `/${name}/${encodeURIComponent(docId)}`
          })
        },
        put (doc = {}) {
          const id = doc._id || ''
          const body = JSON.stringify(doc)
          return request({
            ...defaults,
            method: 'PUT',
            path: `/${name}/${encodeURIComponent(id)}`,
            headers: {
              ...defaults.headers,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(body)
            },
            body: body
          })
        },
        async save (url, doc = {}) {
          const { status, body } = await db.get(url)
          if (status.ok) {
            return db.put({ ...JSON.parse(body), ...doc })
          } else {
            return db.put({ ...doc, _id: url })
          }
        }
      }
      return db
    }
  }
}
