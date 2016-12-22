import dns from 'dns'
import Promise from 'bluebird'

/**
 * Check if the hostname is resolvable
 * string -> boolean
 */
export function isResolvable (hostname) {
  return new Promise(resolve => dns.lookup(hostname, err => resolve(!err)))
}

/**
 * Express middleware for the content negotiation
 */
export function accept (list) {
  return function (req, res, next) {
    if (!req.accepts(list)) {
      return res.status(406).end()
    }
    next()
  }
}
