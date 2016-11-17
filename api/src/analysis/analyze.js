import { parse as parseUrl } from 'url'
import * as rules from './rules'
import { convertHeaders, checkRedirect } from './helpers'

export default function ({ log = {} }) {
  const { pages = [], entries = [] } = log
  const firstEntry = entries[0]
  if (!firstEntry) {
    console.log(log)
    throw new Error('Invalid HAR')
  }
  let totalRedirects = 0
  let http2Requests = 0
  let dns = {}
  let isPage = false
  let page = pages[0]
  const connections = entries.map((entry, idx) => {
    const req = entry.request
    const res = entry.response
    const reqHeaders = convertHeaders(req.headers)
    const resHeaders = convertHeaders(res.headers)
    const url = parseUrl(req.url)
    const hostname = url.hostname
    const status = res.status
    // Fake spdy -> http/2 Chrome headless bug
    // https://groups.google.com/a/chromium.org/forum/#!topic/headless-dev/lysNMNgqFrI
    const httpVersion = res.httpVersion.replace('spdy', 'http/2')
    const isHttp2 = /http\/2/i.test(httpVersion)
    const isHtml = /text\/html/i.test(res.content.mimeType)
    const isRedirect = checkRedirect(status)
    // Capture all domains
    dns[hostname] = entry.serverIPAddress
    // Capture all HTTP/2 requests
    if (isHttp2) {
      http2Requests += 1
    }
    // Capture all redirects
    if (isRedirect) {
      totalRedirects += 1
    }
    const newEntry = {
      bodySize: res.bodySize,
      hostname: hostname,
      httpVersion: httpVersion,
      isHttp2: isHttp2,
      isRedirect: isRedirect,
      redirectUrl: res.redirectURL,
      reqHeaders: reqHeaders,
      resHeaders: resHeaders,
      status: status,
      timings: entry.timings,
      url: req.url
    }
    // Set page entry
    if (isHtml && !isRedirect && !isPage) {
      page = {
        ...newEntry,
        totalBytes: res.content.size,
        pageTimings: {
          ...page.pageTimings,
          onFirstByte: entry.timings.wait
        }
      }
      isPage = true
    }
    return newEntry
  })
  const pageStats = {
    // Total number of requests
    totalRequests: entries.length,
    // Total number of redirects
    totalRedirects: totalRedirects,
    // Check if html page is redirected
    isRedirect: page.isRedirect,
    // Check if page is HTTP/2
    isHttp2: page.isHttp2,
    // Page protocol
    protocol: page.httpVersion,
    // Page host name
    hostname: page.hostname,
    // Number of http2 requests
    http2Requests: http2Requests,
    // Total number of bytes (overall size)
    totalBytes: page.totalBytes,
    // DOM load time
    domLoadTime: page.pageTimings.onContentLoad,
    // Full page load time
    loadTime: page.pageTimings.onLoad,
    // Array of all requested domains
    dns: dns,
    dnsLookups: Object.keys(dns).length,
    // TTFB
    timeToFirstByte: page.pageTimings.onFirstByte
  }
  // console.log(pageStats)

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
