import _ from 'pluralize'
import { normalizeScore, normalizeReason, regex, minifyWhitespace } from './helpers'

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
    reason: `Server responded in ${ttfb} ms`,
    score: score,
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
  const score = 100 - (Math.round(100 * count / validReqs.length) || 0)
  return rule({
    count: count,
    reason: `There ${_('is', count)} ${count} immediately terminated ${_('connection', count)}`,
    score: score,
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
  const score = 100 - (Math.round(100 * count / validReqs.length) || 0)
  return rule({
    count: count,
    reason: `There ${_('is', count)} ${_('resource', count, true)} without cache expiration time`,
    score: score,
    type: 'general',
    values: values.map(val => val.url.href),
    weight: 8
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
  const score = 100 - (Math.round(100 * count / validReqs.length) || 0)
  return rule({
    count: count,
    reason: `There ${_('is', count)} ${_('resource', count, true)} without compression`,
    score: score,
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
    reason: `There ${_('is', values.length)} ${_('redirect', values.length, true)}`,
    score: 100 - (penalty * subCount),
    type: 'general',
    values: values.map((entry) =>
      `(${entry.status} ${entry.statusText || 'Redirect'}) ${entry.url.href} -> ${entry.redirectUrl || '-'}`
    ),
    weight: 7
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
  const score = 100 - (Math.round(100 * count / validReqs.length) || 0)
  return rule({
    count: count,
    reason: `There ${_('is', count)} ${_('resource', count, true)} without Last-Modified or Etag header`,
    score: score,
    type: 'general',
    values: values.map(val => val.url.href),
    weight: 5
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
    score: score,
    type: 'general',
    values: Object.keys(dns).map(key => `${key} (${dns[key]})`),
    weight: 4
  })
}

export function minifyAssets ({ entries, tolerance = 0.05 }) {
  const validReqs = entries.filter(entry =>
    entry.isValid && !entry.isRedirect &&
    entry.content.text && regex.htmlOrJsOrCss.test(entry.content.mimeType)
  )
  const values = validReqs
    .map(entry => {
      const original = entry.content.text
      const minified = minifyWhitespace(original)
      const originalSize = Buffer.byteLength(original, 'utf-8')
      const minifiedSize = Buffer.byteLength(minified, 'utf-8')
      entry.minification = {
        minified: minified,
        original: original,
        minifiedSize: minifiedSize,
        originalSize: originalSize,
        savings: 100 - Math.round(100 * minifiedSize / originalSize)
      }
      return entry
    })
    .filter(({ minification: { originalSize, minifiedSize } }) => {
      return minifiedSize + originalSize * tolerance < originalSize
    })
  const count = values.length
  const score = 100 - (Math.round(100 * count / validReqs.length) || 0)
  return rule({
    count: count,
    reason: `There ${_('is', count)} ${_('resource', count, true)} that can be minified.`,
    score: score,
    type: 'general',
    values: values.map(entry => `${entry.url.href} (At least ~${entry.minification.savings}% savings)`),
    weight: 3
  })
}

export function eliminateBrokenRequests ({ entries, ...opts }) {
  const { penalty = 10 } = opts
  const values = entries.filter(entry => entry.status >= 400)
  const count = values.length
  const score = 100 - (count * penalty)
  return rule({
    count: count,
    reason: `There ${_('is', count)} ${_('resource', count, true)} that not exists`,
    score: score,
    type: 'general',
    values: values.map(entry => `(${entry.status}) ${entry.url.href}`),
    weight: 1
  })
}

export function useHttp2 ({ entries }) {
  const validReqs = entries.filter(entry => entry.isValid && !entry.isRedirect)
  const values = validReqs.filter(entry => !entry.isHttp2)
  const count = values.length
  const score = 100 - (Math.round(100 * count / validReqs.length) || 0)
  return rule({
    count: count,
    reason: `There ${_('is', count)} ${_('resource', count, true)} that ${_('is', count)} not using HTTP/2.`,
    score: score,
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
    score: score,
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
    reason: `There ${_('is', count)} ${_('resource', count, true)} that should avoid concatenating.`,
    score: page.isHttp2 ? 100 - (penalty * count) : null,
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
    reason: `There ${_('is', count)} ${_('resource', count, true)} that can be server pushed with HTTP/2`,
    score: null,
    type: 'h2',
    values: values.map(entry => `${entry.url.href} (${entry.content.size} Bytes)`),
    weight: 3
  })
}
