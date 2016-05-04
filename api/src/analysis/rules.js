import { normalizeScore } from './helpers'

export function reduceDNSlookups (stats, opts = {}) {
  const { limit = 4, penalty = 5 } = opts
  const count = stats.allDomains.length
  // TODO reduce limit for HTTP2?
  let score = 100
  if (count > limit) {
    score -= penalty * (count - limit)
  }
  return {
    title: 'Reduce DNS lookups',
    score: normalizeScore(score),
    description: 'Making requests to a large number of different hosts can hurt performance.'
  }
}
export function reduceRedirects (stats, opts = {}) {
  const { penalty = 10 } = opts
  return {
    title: 'Minimize number of HTTP redirects',
    score: normalizeScore(100 - (penalty * stats.totalRedirects)),
    description: 'HTTP redirects impose high latency overhead. The optimal number of redirects is zero.'
  }
}
export function reuseTCPconnections (stats, connections, opts = {}) {
  const { penalty = 5 } = opts
  const count = connections.filter((conn) => {
    const headers = conn.resHeaders
    return !(headers['connection'] !== 'close')
  }).length
  const limit = stats.allDomains.length
  let score = 100
  if (count > limit) {
    score -= (penalty * (count - limit))
  }
  return {
    title: 'Reuse TCP connections',
    score: normalizeScore(score),
    description: 'Persistent connections allow multiple HTTP requests use the same TCP connection, thus eliminates TCP handshakes and slow-start latency overhead.'
  }
}
export function eliminateRedundancy () {
  return {
    title: 'Eliminate unnecessary bytes and requests',
    score: 0
  }
}
export function eliminateNotFoundRequests (connections, opts = {}) {
  const { penalty = 10 } = opts
  const count = connections.filter((conn) => {
    return conn.status === 404 || conn.status === 410
  }).length
  const score = 100 - (count * penalty)
  return {
    title: 'Eliminate requests to non-existent resources',
    score: normalizeScore(score),
    description: ''
  }
}
export function useCDN () {
  return {
    title: 'Use a Content Delivery Network (CDN)',
    score: 0,
    description: ''
  }
}
export function useCaching (connections, opts = {}) {
  const { limit = 1, penalty = 5 } = opts
  const missing = connections.filter((conn) => {
    const headers = conn.resHeaders
    const isMissing = !headers['cache-control'] || !headers['expires']
    return conn.status === 200 && isMissing
  }).length
  let score = 100
  if (missing > limit) {
    score -= (penalty * (missing - limit))
  }
  console.log(missing)
  return {
    title: 'Cache resources on the client',
    score: normalizeScore(score),
    description: ''
  }
}
export function useCompression (connections, opts = {}) {
  const { minSize = 256, penalty = 5 } = opts
  const contentTypeRegex = /text\/(?:plain|html|css|javascript)|application\/(?:javascript|json|ld\+json|xml|atom\+xml)/
  const contentEncodingRegex = /compress|gzip|deflate|bzip2/
  let count = connections.filter((conn) => {
    const headers = conn.resHeaders
    return (
    (conn.status === 200 || conn.status === 304) &&
    conn.bodySize > minSize &&
    contentTypeRegex.test(headers['content-type']) &&
    !contentEncodingRegex.test(headers['content-encoding'])
    )
  }).length
  const score = 100 - (penalty * count)
  return {
    title: 'Compress assets during transfer',
    score: normalizeScore(score),
    description: 'Application resources should be transferred with the minimum number of bytes. Always apply the best compression method for each transferred asset.'
  }
}
export function useHttp2 (connections, opts = {}) {
  const { penalty = 5 } = opts
  const count = connections.filter((conn) => {
    return (conn.status === 200 || conn.status === 304) && !conn.isHttp2
  }).length
  const score = 100 - penalty * count
  return {
    title: 'Use HTTP/2 for all recources',
    score: normalizeScore(score),
    description: ''
  }
}
