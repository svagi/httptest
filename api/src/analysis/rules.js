import _ from 'pluralize'
import { normalizeScore, normalizeReason, regex } from './helpers'

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
    count: count,
    description: 'Persistent connections allow multiple HTTP requests use the same TCP connection, thus eliminates TCP handshakes and slow-start latency overhead. Leverage persistent connections whenever possible.',
    reason: `There ${_('is', count)} ${count} immediately terminated ${_('connection', count)}`,
    score: score,
    title: 'Reuse TCP connections',
    type: 'general',
    values: subEntries.map(entry => entry.url.href),
    weight: 8
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
    count: count,
    description: 'Reduce the load time of your page by storing commonly used files on your visitors browser.',
    reason: `There ${_('is', count)} ${_('resource', count, true)} without expiration time`,
    score: score,
    title: 'Cache resources on the client',
    type: 'general',
    values: values.map(entry => entry.url.href),
    weight: 8
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
    count: count,
    description: 'Application resources should be transferred with the minimum number of bytes. Always apply the best compression method for each transferred asset.',
    reason: `There ${_('is', count)} ${_('resource', count, true)} without compression`,
    score: score,
    title: 'Compress assets',
    type: 'general',
    values: values.map(entry => entry.url.href),
    weight: 7
  })
}

export function reduceRedirects ({ page, entries, ...opts }) {
  const { penalty = 25 } = opts
  const values = entries.filter(entry => entry.isRedirect)
  const internalRedirects = values.filter(entry =>
      entry.status === 307 &&
      entry.statusText === 'Internal Redirect' &&
      entry.resHeaders['non-authoritative-reason']
  )
  const count = values.length
  const subCount = count - internalRedirects.length
  return rule({
    count: count,
    description: 'HTTP redirects impose high latency overhead. The optimal number of redirects is zero.',
    reason: `There ${_('is', values.length)} ${_('redirect', values.length, true)}`,
    score: 100 - (penalty * subCount),
    title: 'Minimize number of HTTP redirects',
    type: 'general',
    values: values.map((entry) =>
      `(${entry.status} ${entry.statusText || 'Redirect'}) ${entry.url.href} -> ${entry.redirectUrl || '-'}`
    ),
    weight: 7
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
    count: dnsLookups,
    description: 'Making requests to a large number of different hosts can hurt performance.',
    score: score,
    title: 'Reduce DNS lookups',
    type: 'general',
    values: Object.keys(dns).map(key => `${key} (${dns[key]})`),
    weight: 4
  })
}

export function eliminateBrokenRequests ({ entries, ...opts }) {
  const { penalty = 10 } = opts
  const values = entries.filter(entry => entry.status >= 400)
  const count = values.length
  const score = 100 - (count * penalty)
  return rule({
    count: count,
    description: 'Avoid fetching content that does not exist.',
    reason: `There ${_('is', count)} ${_('resource', count, true)} that not exists`,
    score: score,
    title: 'Eliminate requests to non-existent or broken resources.',
    type: 'general',
    values: values.map(entry => `(${entry.status}) ${entry.url.href}`),
    weight: 2
  })
}

export function useHttp2 ({ entries }) {
  const requests = entries.filter(entry => entry.isValid && !entry.isRedirect)
  const values = requests.filter(entry => !entry.isHttp2)
  const count = values.length
  const score = 100 - Math.round(100 * (count / requests.length))
  return rule({
    count: count,
    description: 'HTTP/2 enables more efficient use of network resources and reduced latency by enabling request and response multiplexing, header compression, prioritization, and more.',
    reason: `There ${_('is', count)} ${_('resource', count, true)} that are not using HTTP/2 connections`,
    score: score,
    title: 'Serve your content using HTTP/2',
    type: 'h2',
    values: values.map(entry => entry.url.href),
    weight: 4
  })
}

export function eliminateDomainSharding ({ page, entries, opts = {} }) {
  const { penalty = 25, limit = 1 } = opts
  const h2entries = entries.filter(entry =>
    entry.isHttp2 &&
    entry.isValid &&
    !entry.isRedirect
  )
  const reverseDns = h2entries
    .reduce((obj, entry) => {
      const domains = obj[entry.ip]
      obj[entry.ip] = domains ? domains.add(entry.hostname) : new Set()
      return obj
    }, {})
  const values = Object.keys(reverseDns)
  const count = values.length - limit
  const score = h2entries.length > 0 ? 100 - (count * penalty) : null
  return rule({
    count: count,
    description: 'Under HTTP/1 parallelism is limited by number of TCP connections (in practice ~6 connections per origin). However, each of these connections incur unnecessary overhead and compete with each other for bandwidth. Domain sharding should be avoided in HTTP/2.',
    score: score,
    title: 'Elimiminate domain sharding',
    type: 'h2',
    values: values.map(ip => `${ip} -> ${[...reverseDns[ip]].join(', ')}`),
    weight: 4
  })
}

export function avoidConcatenating ({ page, entries, ...opts }) {
  const { maxSize = 70000, penalty = 5 } = opts
  const values = entries.filter(entry =>
    entry.isHttp2 &&
    entry.isValid &&
    entry.content.size >= maxSize &&
    regex.jsOrCss.test(entry.content.mimeType)
  )
  const count = values.length
  return rule({
    count: count,
    description: 'Ship small granular resources and optimize caching policies. Significant wins in compression are the only cases where it might be useful to benefit from resource concatenating.',
    reason: `There ${_('is', count)} ${_('resource', count, true)} that should avoid concatenating.`,
    score: page.isHttp2 ? 100 - (penalty * count) : null,
    title: 'Avoid resource concatenating',
    type: 'h2',
    values: values.map(entry => `${entry.url.href} (${entry.content.size} Bytes)`),
    weight: 2
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
    count: count,
    description: 'Server push enables the server to send multiple responses (in parallel) for a single client request, thus eliminates entire roundtrips of unnecessary network latency.',
    reason: `There ${_('is', count)} ${_('resource', count, true)} that can be server pushed with HTTP/2`,
    score: null,
    title: 'Eliminate roundtrips with Server Push',
    type: 'h2',
    values: values.map(entry => `${entry.url.href} (${entry.content.size} Bytes)`),
    weight: 3
  })
}
