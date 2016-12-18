import dns from 'dns'
import Promise from 'bluebird'

/**
 * Check if the hostname is resolvable
 * string -> boolean
 */
export function isResolvable (hostname) {
  return new Promise(resolve => dns.lookup(hostname, err => resolve(!err)))
}
