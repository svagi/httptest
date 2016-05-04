import * as rules from './rules'
import { convertHeaders } from './helpers'

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
  let connections = []

  entries.forEach((entry, idx) => {
    const req = entry.request
    const res = entry.response
    const status = res.status
    const isHttp2 = /HTTP\/2/.test(res.httpVersion)
    const reqHeaders = convertHeaders(req.headers)
    const resHeaders = convertHeaders(res.headers)
    // const contentType = resHeaders['content-type']

    // Capture all HTTP/2 requests
    if (isHttp2) {
      http2Requests += 1
    }

    // Capture all domains
    allDomains.add(reqHeaders['host'])

    // Capture all redirects
    if ([301, 302, 307].indexOf(status) > -1) {
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

    connections[idx] = {
      isHttp2: isHttp2,
      status: status,
      bodySize: res.bodySize,
      resHeaders: resHeaders
    }
  })

  const stats = {
    // Total number of requests
    totalRequests: entries.length,

    // Total number of redirects
    totalRedirects: totalRedirects,

    // Check if landing html page is redirected
    isLandingRedirected: htmlRedirect,

    // Check if landing html page is HTTP/2
    isLandingHttp2: /HTTP\/2/.test(htmlEntry.response.httpVersion),

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
    // Convert domains to array
    allDomains: [...allDomains],

    // TTFB
    timeToFirstByte: htmlEntry.time
  }

  // Analysis object
  const analysis = {
    stats: stats,
    rules: {
      useHttp2: rules.useHttp2(connections),
      reduceDNSlookups: rules.reduceDNSlookups(stats),
      reduceRedirects: rules.reduceRedirects(stats),
      reuseTCPconnections: rules.reuseTCPconnections(stats, connections),
      eliminateNotFoundRequests: rules.eliminateNotFoundRequests(connections),
      useCaching: rules.useCaching(connections),
      useCompression: rules.useCompression(connections)
    }
  }
  console.log(analysis)
  return analysis
}