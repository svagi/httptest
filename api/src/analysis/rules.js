import _ from 'pluralize'
import { normalizeRule } from './helpers'

export function reuseTCPconnections ({ page, entries, ...opts }) {
  const { penalty = 5 } = opts
  const subEntries = entries.filter((conn) => {
    const headers = conn.resHeaders
    return !(headers['connection'] !== 'close')
  })
  const count = subEntries.length
  const limit = page.dnsLookups
  let score = 100
  if (count > limit) {
    score -= (penalty * (count - limit))
  }
  return normalizeRule({
    title: 'Reuse TCP connections',
    score: score,
    description: 'Persistent connections allow multiple HTTP requests use the same TCP connection, thus eliminates TCP handshakes and slow-start latency overhead. Use HTTP/2 or try to enable Keep-Alive.',
    reason: `There ${_('is', count)} ${count} immediately terminated ${_('connection', count)}`,
    values: subEntries.map(entry => entry.url),
    count: count
  })
}
export function useCaching ({ page, entries, ...opts }) {
  const { limit = 1, penalty = 5 } = opts
  // TODO content type
  const subEntries = entries.filter((conn) => {
    const headers = conn.resHeaders
    return conn.status === 200 &&
    (!headers['cache-control'] || !headers['expires'])
  })
  const count = subEntries.length
  let score = 100
  if (count > limit) {
    score -= (penalty * (count - limit))
  }
  return normalizeRule({
    title: 'Cache resources on the client',
    score: score,
    description: 'Reduce the load times of pages by storing commonly used files from your website on your visitors browser.',
    reason: `There ${_('is', count)} ${_('resource', count, true)} without expiration time`,
    values: subEntries.map(entry => entry.url),
    count: count
  })
}
export function useCompression ({ page, entries, ...opts }) {
  const { minSize = 256, penalty = 5 } = opts
  const contentTypeRegex = /text\/(?:plain|html|css|javascript)|application\/(?:javascript|json|ld\+json|xml|atom\+xml)/
  const contentEncodingRegex = /compress|gzip|deflate|bzip2/
  const subEntries = entries.filter((conn) => {
    const headers = conn.resHeaders
    return (
      (conn.status === 200 || conn.status === 304) &&
      conn.bodySize > minSize &&
      contentTypeRegex.test(headers['content-type']) &&
      !contentEncodingRegex.test(headers['content-encoding'])
    )
  })
  const count = subEntries.length
  const score = 100 - (penalty * count)
  return normalizeRule({
    title: 'Compress assets',
    score: score,
    description: 'Application resources should be transferred with the minimum number of bytes. Always apply the best compression method for each transferred asset.',
    reason: `There ${_('is', count)} ${_('resource', count, true)} without compression`,
    values: subEntries.map(entry => entry.url),
    count: count
  })
}
export function reduceRedirects ({ page, entries, ...opts }) {
  const { penalty = 25 } = opts
  const subEntries = entries.filter((conn) => conn.isRedirect)
  const count = subEntries.length
  return normalizeRule({
    title: 'Minimize number of HTTP redirects',
    score: 100 - (penalty * count),
    description: 'HTTP redirects impose high latency overhead. The optimal number of redirects is zero.',
    reason: `There ${_('is', count)} ${_('redirect', count, true)}`,
    values: subEntries.map((entry) => `(${entry.status}) ${entry.url} -> ${entry.redirectUrl || '-'}`),
    count: count
  })
}

export function reduceDNSlookups ({ page, ...opts }) {
  const { limit = 4, penalty = 5 } = opts
  const { dns, dnsLookups } = page
  // TODO reduce limit for HTTP2?
  let score = 100
  if (dnsLookups > limit) {
    score -= penalty * (dnsLookups - limit)
  }
  return normalizeRule({
    title: 'Reduce DNS lookups',
    score: score,
    description: 'Making requests to a large number of different hosts can hurt performance.',
    values: Object.keys(dns),
    count: dnsLookups
  })
}

export function eliminateNotFoundRequests ({ entries, ...opts }) {
  const { penalty = 10 } = opts
  const subEntries = entries.filter((conn) => {
    return conn.status === 404 || conn.status === 410
  })
  const count = subEntries.length
  return normalizeRule({
    title: 'Eliminate requests to non-existent resources',
    score: 100 - (count * penalty),
    description: 'Avoid fetching content that does not exist.',
    reason: count > 0 ? `There ${_('is', count)} ${_('resource', count, true)} that not exists` : '',
    values: subEntries.map(entry => `(${entry.status}) ${entry.url}`),
    count: count
  })
}

export function eliminateDomainSharding ({ page }) {
  // TODO
  return normalizeRule({
    title: 'HTTP/2: Elimiminate domain sharding',
    score: page.isHttp2 ? 100 : null,
    description: 'Under HTTP/1 parallelism is limited by number of TCP connections (in practice ~6 connections per origin). However, each of these connections incur unnecessary overhead and compete with each other for bandwidth. Domain sharding should be avoided in HTTP/2.',
    reason: ''
  })
}

export function useServerPush ({ page, entries, ...opts }) {
  const { minSize = 30000, penalty = 5 } = opts
  const contentTypeRegex = /.*(?:text\/(?:css|javascript)|(?:application\/javascript)).*/
  const subEntries = entries.filter((entry) => {
    return entry.bodySize < minSize &&
    contentTypeRegex.test(entry.reqHeaders['accept']) &&
    entry.hostname === page.hostname
  })
  const h2entries = subEntries.filter(entry => {
    return entry.isHttp2 && !(entry.status === 0)
  })

  const values = page.isHttp2 ? h2entries : subEntries
  const count = values.length
  const score = page.isHttp2 ? 100 - (penalty * count) : null
  return normalizeRule({
    title: 'HTTP/2: Use server push for small assets',
    score: score,
    description: 'Server push enables the server to send multiple responses (in parallel) for a single client request, thus eliminates entire roundtrips of unnecessary network latency.',
    reason: `There ${_('is', count)} ${_('resource', count, true)} that can be server pushed with HTTP/2`,
    values: values.map(entry => `${entry.url} (${entry.bodySize} Bytes)`),
    count: count
  })
}

export function avoidConcatenating ({ page, entries, ...opts }) {
  const { maxSize = 70000, penalty = 5 } = opts
  const contentTypeRegex = /text\/(?:css|javascript)|application\/javascript/
  const subEntries = entries.filter((entry) => {
    return entry.bodySize > maxSize &&
    contentTypeRegex.test(entry.reqHeaders['accept'])
  })
  const count = subEntries.length
  return normalizeRule({
    title: 'HTTP/2: Avoid resource concatenating',
    score: page.isHttp2 ? 100 - (penalty * count) : null,
    description: 'Ship small granular resources and optimize caching policies. Significant wins in compression are the only case where it might be useful.',
    reason: '',
    values: subEntries.map(entry => `${entry.url} (${entry.bodySize}) B`),
    count: count
  })
}
