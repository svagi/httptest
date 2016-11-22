import _ from 'pluralize'
import { normalizeScore, normalizeReason, sum, regex } from './helpers'

// Main rule wrapper with properties normalization
function rule (props) {
  props.score = normalizeScore(props.score)
  props.reason = normalizeReason(props.reason, props.count)
  return props
}

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
  return rule({
    title: 'Reuse TCP connections',
    weight: 8,
    score: score,
    description: 'Persistent connections allow multiple HTTP requests use the same TCP connection, thus eliminates TCP handshakes and slow-start latency overhead. Leverage persistent connections whenever possible.',
    reason: `There ${_('is', count)} ${count} immediately terminated ${_('connection', count)}`,
    values: subEntries.map(entry => entry.url.href),
    count: count
  })
}
export function cacheAssets ({ page, entries, ...opts }) {
  const { limit = 1, penalty = 5 } = opts
  const values = entries.filter((entry) => {
    const headers = entry.resHeaders
    return !entry.isRedirect &&
      entry.isValid &&
      !entry.isRedirect &&
      (!headers['cache-control'] || !headers['expires'])
  })
  const count = values.length
  let score = 100
  if (count > limit) {
    score -= penalty * (count - limit)
  }
  return rule({
    title: 'Cache resources on the client',
    weight: 8,
    score: score,
    description: 'Reduce the load time of your page by storing commonly used files on your visitors browser.',
    reason: `There ${_('is', count)} ${_('resource', count, true)} without expiration time`,
    values: values.map(entry => entry.url.href),
    count: count
  })
}
export function compressAssets ({ page, entries, ...opts }) {
  const { minSize = 256, penalty = 5 } = opts
  const values = entries.filter((entry) => {
    const headers = entry.resHeaders
    return (
      entry.isValid &&
      !entry.isRedirect &&
      entry.content.size >= minSize &&
      regex.text.test(entry.content.mimeType) &&
      !regex.encoding.test(headers['content-encoding'])
    )
  })
  const count = values.length
  const score = 100 - (penalty * count)
  return rule({
    title: 'Compress assets',
    weight: 7,
    score: score,
    description: 'Application resources should be transferred with the minimum number of bytes. Always apply the best compression method for each transferred asset.',
    reason: `There ${_('is', count)} ${_('resource', count, true)} without compression`,
    values: values.map(entry => entry.url.href),
    count: count
  })
}

export function reduceRedirects ({ page, entries, ...opts }) {
  const { penalty = 25 } = opts
  const subEntries = entries.filter((entry) => entry.isRedirect)
  const count = subEntries.length
  return rule({
    title: 'Minimize number of HTTP redirects',
    weight: 7,
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
  return rule({
    title: 'Reduce DNS lookups',
    score: score,
    weight: 4,
    description: 'Making requests to a large number of different hosts can hurt performance.',
    values: Object.keys(dns).map(key => `${key} (${dns[key]})`),
    count: dnsLookups
  })
}

export function eliminateBrokenRequests ({ entries, ...opts }) {
  const { penalty = 10 } = opts
  const values = entries.filter((entry) => entry.status >= 400)
  const count = values.length
  const score = 100 - (count * penalty)
  return rule({
    title: 'Eliminate requests to non-existent or broken resources.',
    weight: 2,
    score: score,
    description: 'Avoid fetching content that does not exist.',
    reason: `There ${_('is', count)} ${_('resource', count, true)} that not exists`,
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
  const count = sum(values.map(ip => reverseDns[ip].size - limit))
  const score = h2entries.length > 0 ? 100 - (count * penalty) : null
  return rule({
    title: 'HTTP/2: Elimiminate domain sharding',
    score: score,
    weight: 4,
    description: 'Under HTTP/1 parallelism is limited by number of TCP connections (in practice ~6 connections per origin). However, each of these connections incur unnecessary overhead and compete with each other for bandwidth. Domain sharding should be avoided in HTTP/2.',
    reason: '',
    count: count,
    values: values.map(ip => `${ip} -> ${[...reverseDns[ip]].join(', ')}`)
  })
}

export function useServerPush ({ page, entries, ...opts }) {
  const { maxSize = 5000 } = opts
  const values = entries.filter(entry => (
    entry.isValid &&
    entry.isHttp2 &&
    regex.jsOrCss.test(entry.content.mimeType) &&
    entry.content.size <= maxSize
  ))
  const count = values.length
  return rule({
    title: 'HTTP/2: Eliminate roundtrips with Server Push',
    score: null,
    weight: 3,
    description: 'Server push enables the server to send multiple responses (in parallel) for a single client request, thus eliminates entire roundtrips of unnecessary network latency.',
    reason: `There ${_('is', count)} ${_('resource', count, true)} that can be server pushed with HTTP/2`,
    values: values.map(entry => `${entry.url.href} (${entry.content.size} Bytes)`),
    count: count
  })
}

export function avoidConcatenating ({ page, entries, ...opts }) {
  const { maxSize = 70000, penalty = 5 } = opts
  const values = entries.filter((entry) => {
    return entry.content.size >= maxSize &&
    regex.jsOrCss.test(entry.content.mimeType)
  })
  const count = values.length
  return rule({
    title: 'HTTP/2: Avoid resource concatenating',
    weight: 2,
    score: page.isHttp2 ? 100 - (penalty * count) : null,
    description: 'Ship small granular resources and optimize caching policies. Significant wins in compression are the only case where it might be useful.',
    reason: '',
    values: values.map(entry => `${entry.url.href} (${entry.content.size} Bytes)`),
    count: count
  })
}
