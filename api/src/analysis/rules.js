import _ from 'pluralize'
import { normalizeScore, normalizeReason, regex } from './helpers'

// Main rule wrapper with properties normalization
function rule (props) {
  props.score = normalizeScore(props.score)
  props.reason = normalizeReason(props.reason, props.count)
  return props
}

export function reduceServerResponseTime ({ page, min = 200, max = 1000 }) {
  const ttfb = Math.round(page.timeToFirstByte)
  const threshold = ttfb - min
  const score = threshold > 0 ? 100 - Math.round(100 * threshold / (max - min)) : 100
  // TODO latency
  return rule({
    count: 1,
    description: 'Long web server response times delay page loading speeds.',
    reason: `Server responded in ${ttfb} ms`,
    score: score,
    title: 'Improve server response time',
    type: 'general',
    values: [],
    weight: 9
  })
}

export function reuseTCPconnections ({ page, entries }) {
  const validReqs = entries.filter(entry =>
    entry.isValid && !entry.isRedirect
  )
  const values = validReqs.filter(entry =>
    !(entry.resHeaders.connection !== 'close')
  )
  const count = values.length
  const score = 100 - Math.round(100 * (count / validReqs.length))
  return rule({
    count: count,
    description: 'Persistent connections allow multiple HTTP requests use the same TCP connection, thus eliminates TCP handshakes and slow-start latency overhead. Leverage persistent connections whenever possible.',
    reason: `There ${_('is', count)} ${count} immediately terminated ${_('connection', count)}`,
    score: score,
    title: 'Reuse TCP connections',
    type: 'general',
    values: values.map(entry => entry.url.href),
    weight: 8
  })
}
export function cacheAssets ({ page, entries }) {
  const validReqs = entries.filter(entry =>
    entry.isValid && !entry.isRedirect
  )
  const values = validReqs.filter(({ isValid, isRedirect, resHeaders, url }) =>
    !resHeaders['cache-control'] && !resHeaders['expires']
  )
  const count = values.length
  const score = 100 - Math.round(100 * (count / validReqs.length))
  return rule({
    count: count,
    description: 'Reduce the load time of your page by storing commonly used files on your visitors browser.',
    reason: `There ${_('is', count)} ${_('resource', count, true)} without cache expiration time`,
    score: score,
    title: 'Cache resources on the client',
    type: 'general',
    values: values.map(val => val.url.href),
    weight: 8
  })
}

export function useCacheValidators ({ page, entries }) {
  const validReqs = entries.filter(entry =>
    entry.isValid && !entry.isRedirect
  )
  const values = validReqs.filter(({ resHeaders, url }) =>
    !resHeaders['last-modified'] && !resHeaders['etag']
  )
  const count = values.length
  const score = 100 - Math.round(100 * (count / validReqs.length))
  return rule({
    count: count,
    description: 'Specify the Last-Modified or Etag header to allow the client to check if the expired resource has been updated, if not data transfer can be omitted.',
    reason: `There ${_('is', count)} ${_('resource', count, true)} without Last-Modified or Etag header`,
    score: score,
    title: 'Specify cache validation mechanisms',
    type: 'general',
    values: values.map(val => val.url.href),
    weight: 5
  })
}

export function compressAssets ({ page, entries, ...opts }) {
  const { minSize = 256 } = opts
  const validReqs = entries.filter(entry =>
    entry.isValid && !entry.isRedirect
  )
  const values = validReqs.filter((entry) => {
    const headers = entry.resHeaders
    return (
      entry.content.size >= minSize &&
      regex.text.test(entry.content.mimeType) &&
      !regex.encoding.test(headers['content-encoding'])
    )
  })
  const count = values.length
  const score = 100 - Math.round(100 * (count / validReqs.length))
  return rule({
    count: count,
    description: 'Application resources should be transferred with the minimum number of bytes. Always apply the best compression method for each transferred asset.',
    reason: `There ${_('is', count)} ${_('resource', count, true)} without compression`,
    score: score,
    title: 'Compress resources during transfer',
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
    title: 'Eliminate requests to non-existent or broken resources',
    type: 'general',
    values: values.map(entry => `(${entry.status}) ${entry.url.href}`),
    weight: 1
  })
}

export function useHttp2 ({ entries }) {
  const validReqs = entries.filter(entry => entry.isValid && !entry.isRedirect)
  const values = validReqs.filter(entry => !entry.isHttp2)
  const count = values.length
  const score = 100 - Math.round(100 * (count / validReqs.length))
  return rule({
    count: count,
    description: 'HTTP/2 enables more efficient use of network resources and reduced latency by enabling request and response multiplexing, header compression, prioritization, and more.',
    reason: `There ${_('is', count)} ${_('resource', count, true)} that are not using HTTP/2 connections`,
    score: score,
    title: 'Serve all resources using HTTP/2',
    type: 'h2',
    values: values.map(entry => entry.url.href),
    weight: 4
  })
}

export function eliminateDomainSharding ({ page, entries, opts = {} }) {
  const { penalty = 20, limit = 1 } = opts
  const h2entries = entries.filter(entry =>
    entry.isHttp2 &&
    entry.isValid &&
    !entry.isRedirect
  )
  const reverseDns = h2entries
    .reduce((obj, { hostname, ip }) => {
      const domains = obj[ip]
      obj[ip] = domains ? domains.add(hostname) : new Set([hostname])
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
