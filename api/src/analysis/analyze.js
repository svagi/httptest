import * as rules from './rules'
import { convertHeaders, checkRedirect } from './helpers'

export default function ({ log = {} }) {
  const { pages = [], entries = [] } = log
  const firstEntry = entries[0]
  if (!firstEntry) {
    throw new Error('Invalid HAR')
  }
  let totalRedirects = 0
  let http2Requests = 0
  let totalBytes = 0
  let domLoadTime = 0
  let loadTime = 0
  let dns = {}
  let page = pages[0]
  let htmlRedirect = false
  let htmlEntry = {
    ...firstEntry,
    reqHeaders: convertHeaders(firstEntry.request.headers),
    resHeaders: convertHeaders(firstEntry.response.headers)
  }
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
    dns[reqHeaders['host']] = entry.serverIPAddress
    // Capture all redirects
    if (isRedirect) {
      totalRedirects += 1
      const nextEntry = entries[idx + 1]
      if (nextEntry) {
        const nextEntryReqHeaders = convertHeaders(nextEntry.request.headers)
        const nextEntryResHeaders = convertHeaders(nextEntry.response.headers)
        const nextEntryIsHtml = /text\/html/.test(nextEntryResHeaders['content-type'])
        if (nextEntry.response.status === 200 && nextEntryIsHtml) {
          htmlRedirect = true
          htmlEntry = {
            ...nextEntry,
            reqHeaders: nextEntryReqHeaders,
            resHeaders: nextEntryResHeaders
          }
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
  const pageStats = {
    // Total number of requests
    totalRequests: entries.length,

    // Total number of redirects
    totalRedirects: totalRedirects,

    // Check if html page is redirected
    isRedirected: htmlRedirect,

    // Check if page is HTTP/2
    isHttp2: /HTTP\/2/.test(htmlEntry.response.httpVersion),

    // Page protocol
    protocol: htmlEntry.response.httpVersion,

    // Page host name
    host: htmlEntry.reqHeaders['host'],

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
    dns: dns,
    dnsLookups: Object.keys(dns).length,

    // TTFB
    timeToFirstByte: page.pageTimings.onFirstByte
  }

  // Analysis object
  const analysis = {
    page: pageStats,
    rules: {
      reuseTCPconnections: rules.reuseTCPconnections(pageStats, connections),
      useCaching: rules.useCaching(connections),
      useCompression: rules.useCompression(connections),
      reduceRedirects: rules.reduceRedirects(connections),
      reduceDNSlookups: rules.reduceDNSlookups(pageStats),
      eliminateNotFoundRequests: rules.eliminateNotFoundRequests(connections),
      eliminateDomainSharding: rules.eliminateDomainSharding(pageStats),
      useServerPush: rules.useServerPush(pageStats, connections),
      avoidConcatenating: rules.avoidConcatenating(pageStats, connections)
    }
  }
  // console.log(analysis.rules.reduceRedirects)
  return analysis
}
