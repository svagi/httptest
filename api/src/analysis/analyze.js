import * as rules from './rules'
import { convertHeaders, checkRedirect } from './helpers'

export default function ({ log = {} }) {
  const { pages = [], entries = [] } = log
  let totalRedirects = 0
  let http2Requests = 0
  let totalBytes = 0
  let domLoadTime = 0
  let loadTime = 0
  let allDomains = new Set()
  let page = pages[0]
  let htmlRedirect = false
  let htmlEntry = entries[0]
  const connections = entries.map((entry, idx) => {
    const req = entry.request
    const res = entry.response
    const status = res.status
    const isHttp2 = /HTTP\/2/.test(res.httpVersion)
    const isRedirect = checkRedirect(status)
    const reqHeaders = convertHeaders(req.headers)
    const resHeaders = convertHeaders(res.headers)
    // Capture all HTTP/2 requests
    if (isHttp2) {
      http2Requests += 1
    }
    // Capture all domains
    allDomains.add(reqHeaders['host'])
    // Capture all redirects
    if (isRedirect) {
      totalRedirects += 1
      const nextEntry = entries[idx + 1]
      if (nextEntry) {
        const nextEntryResHeaders = convertHeaders(nextEntry.response.headers)
        const nextEntryIsHtml = /text\/html/.test(nextEntryResHeaders['content-type'])
        if (nextEntry.response.status === 200 && nextEntryIsHtml) {
          htmlRedirect = true
          htmlEntry = nextEntry
        }
      }
    }
    // Calculate byte size of all requests
    const { headersSize, bodySize } = res
    if (headersSize > 0) {
      totalBytes += headersSize
    }
    if (bodySize > 0) {
      totalBytes += bodySize
    }
    // Calculate page load time by maximum entry time
    const { startedDateTime, time } = entry
    const entryTime = new Date(startedDateTime).getTime() + time
    if (loadTime < entryTime) {
      loadTime = entryTime
    }
    return {
      isHttp2: isHttp2,
      isRedirect: isRedirect,
      status: status,
      url: req.url,
      redirectUrl: res.redirectURL,
      bodySize: res.bodySize,
      reqHeaders: reqHeaders,
      resHeaders: resHeaders
    }
  })

  // Convert domains to array
  allDomains = [...allDomains]

  const stats = {
    // Total number of requests
    totalRequests: entries.length,

    // Total number of redirects
    totalRedirects: totalRedirects,

    // Check if landing html page is redirected
    isLandingRedirected: htmlRedirect,

    // Check if landing html page is HTTP/2
    isLandingHttp2: /HTTP\/2/.test(htmlEntry.response.httpVersion),
    landingHttpVersion: htmlEntry.response.httpVersion,

    // Number of http2 requests
    http2Requests: http2Requests,

    // Total number of bytes (overall size)
    totalBytes: totalBytes,

    // DOM load time
    // Set page timings from performance.timing if exists
    domLoadTime: page.pageTimings.onLoad > 0
      ? page.pageTimings.onContentLoad
      : domLoadTime,

    // Full page load time
    // Set page timings from performance.timing if exists
    loadTime: page.pageTimings.onLoad > 0
      ? page.pageTimings.onLoad
      // Convert loadTime [datetime] to milisecods
      : loadTime - new Date(page.startedDateTime).getTime(),

    // Array of all requested domains
    allDomains: allDomains,

    // TTFB
    timeToFirstByte: page.pageTimings.onConnect,

    // DNS resolution lookups
    dnsLookups: allDomains.length
  }

  // Analysis object
  const analysis = {
    stats: stats,
    rules: {
      useServerPush: rules.useServerPush(stats, connections),
      reduceDNSlookups: rules.reduceDNSlookups(allDomains),
      reduceRedirects: rules.reduceRedirects(connections),
      reuseTCPconnections: rules.reuseTCPconnections(stats, connections),
      eliminateNotFoundRequests: rules.eliminateNotFoundRequests(connections),
      useCaching: rules.useCaching(connections),
      useCompression: rules.useCompression(connections)
    }
  }
  // console.log(analysis.rules.reduceRedirects)
  return analysis
}
