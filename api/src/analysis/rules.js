import _ from 'pluralize'
import { normalizeRule, sum } from './helpers'

export function reuseTCPconnections ({ page, entries, ...opts }) {
  const { penalty = 5, limit = 1 } = opts
  const subEntries = entries.filter(entry =>
    entry.isValid &&
    !entry.isRedirect &&
    !(entry.resHeaders.connection !== 'close')
  )
  const count = subEntries.length
  let score = 100
  if (count > limit) {
    score -= penalty * (count - limit)
  }
  return normalizeRule({
    title: 'Reuse TCP connections',
    score: score,
    description: 'Persistent connections allow multiple HTTP requests use the same TCP connection, thus eliminates TCP handshakes and slow-start latency overhead. Use HTTP/2 or try to enable Keep-Alive.',
    reason: `There ${_('is', count)} ${count} immediately terminated ${_('connection', count)}`,
    values: subEntries.map(entry => entry.url.href),
    count: count
  })
}
export function useCaching ({ page, entries, ...opts }) {
  const { limit = 1, penalty = 5 } = opts
  const values = entries.filter((entry) => {
    const headers = entry.resHeaders
    return !entry.isRedirect &&
      entry.isValid &&
      (!headers['cache-control'] || !headers['expires'])
  })
  const count = values.length
  let score = 100
  if (count > limit) {
    score -= penalty * (count - limit)
  }
  return normalizeRule({
    title: 'Cache resources on the client',
    score: score,
    description: 'Reduce the load times of pages by storing commonly used files from your website on your visitors browser.',
    reason: `There ${_('is', count)} ${_('resource', count, true)} without expiration time`,
    values: values.map(entry => entry.url.href),
    count: count
  })
}
export function useCompression ({ page, entries, ...opts }) {
  const { minSize = 256, penalty = 5 } = opts
  const contentTypeRegex = /text\/(?:plain|html|css|javascript)|application\/(?:javascript|json|ld\+json|xml|atom\+xml)/
  const contentEncodingRegex = /compress|gzip|deflate|bzip2/
  const subEntries = entries.filter((entry) => {
    const headers = entry.resHeaders
    return (
      entry.isValid &&
      entry.content.size >= minSize &&
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
    values: subEntries.map(entry => entry.url.href),
    count: count
  })
}
export function reduceRedirects ({ page, entries, ...opts }) {
  const { penalty = 25 } = opts
  const subEntries = entries.filter((entry) => entry.isRedirect)
  const count = subEntries.length
  return normalizeRule({
    title: 'Minimize number of HTTP redirects',
    score: 100 - (penalty * count),
    description: 'HTTP redirects impose high latency overhead. The optimal number of redirects is zero.',
    reason: `There ${_('is', count)} ${_('redirect', count, true)}`,
    values: subEntries.map((entry) => `(${entry.status}) ${entry.url.href} -> ${entry.redirectUrl || '-'}`),
    count: count
  })
}

export function reduceDNSlookups ({ page, ...opts }) {
  const { limit = 4, penalty = 5 } = opts
  const { dns, dnsLookups } = page
  let score = 100
  if (dnsLookups > limit) {
    score -= penalty * (dnsLookups - limit)
  }
  return normalizeRule({
    title: 'Reduce DNS lookups',
    score: score,
    description: 'Making requests to a large number of different hosts can hurt performance.',
    values: Object.keys(dns).map(key => `${key} (${dns[key]})`),
    count: dnsLookups
  })
}

export function eliminateNotFoundRequests ({ entries, ...opts }) {
  const { penalty = 10 } = opts
  const values = entries
    .filter((entry) => entry.status === 404 || entry.status === 410)
  const count = values.length
  const score = 100 - (count * penalty)
  return normalizeRule({
    title: 'Eliminate requests to non-existent resources',
    score: score,
    description: 'Avoid fetching content that does not exist.',
    reason: count > 0 ? `There ${_('is', count)} ${_('resource', count, true)} that not exists` : '',
    values: values.map(entry => `(${entry.status}) ${entry.url.href}`),
    count: count
  })
}

export function eliminateDomainSharding ({ page, entries, opts = {} }) {
  // TODO HTTP/2 connection coalescing
  const { penalty = 25, limit = 1 } = opts
  const h2entries = entries.filter(entry => (
    entry.isHttp2 &&
    entry.status
  ))
  const reverseDns = h2entries
    .reduce((obj, entry) => {
      const domains = obj[entry.ip]
      obj[entry.ip] = domains ? domains.add(entry.hostname) : new Set()
      return obj
    }, {})
  const reverseDnsKeys = Object.keys(reverseDns)
  const values = reverseDnsKeys.filter(ip => reverseDns[ip].size >= 2)
  const count = values.map(ip => reverseDns[ip].size - limit).reduce(sum, 0)
  const score = h2entries.length > 0 ? 100 - (count * penalty) : null
  return normalizeRule({
    title: 'HTTP/2: Elimiminate domain sharding',
    score: score,
    description: 'Under HTTP/1 parallelism is limited by number of TCP connections (in practice ~6 connections per origin). However, each of these connections incur unnecessary overhead and compete with each other for bandwidth. Domain sharding should be avoided in HTTP/2.',
    reason: '',
    count: count,
    values: values.map(ip => `${ip} -> ${[...reverseDns[ip]].join(', ')}`)
  })
}

export function useServerPush ({ page, entries, ...opts }) {
  const { maxSize = 5000 } = opts
  const contentTypeRegex = /.*(?:text\/(?:css|javascript)|(?:application\/javascript)).*/
  const values = entries.filter(entry => (
    entry.isValid &&
    entry.isHttp2 &&
    contentTypeRegex.test(entry.content.mimeType) &&
    entry.content.size <= maxSize
  ))
  const count = values.length
  return normalizeRule({
    title: 'HTTP/2: Eliminate roundtrips with Server Push',
    score: null,
    description: 'Server push enables the server to send multiple responses (in parallel) for a single client request, thus eliminates entire roundtrips of unnecessary network latency.',
    reason: `There ${_('is', count)} ${_('resource', count, true)} that can be server pushed with HTTP/2`,
    values: values.map(entry => `${entry.url.href} (${entry.content.size} Bytes)`),
    count: count
  })
}

export function avoidConcatenating ({ page, entries, ...opts }) {
  const { maxSize = 70000, penalty = 5 } = opts
  const contentTypeRegex = /text\/(?:css|javascript)|application\/javascript/
  const values = entries.filter((entry) => {
    return entry.content.size >= maxSize &&
    contentTypeRegex.test(entry.content.mimeType)
  })
  const count = values.length
  return normalizeRule({
    title: 'HTTP/2: Avoid resource concatenating',
    score: page.isHttp2 ? 100 - (penalty * count) : null,
    description: 'Ship small granular resources and optimize caching policies. Significant wins in compression are the only case where it might be useful.',
    reason: '',
    values: values.map(entry => `${entry.url.href} (${entry.content.size} Bytes)`),
    count: count
  })
}
