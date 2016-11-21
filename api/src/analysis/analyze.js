import { parse as parseUrl } from 'url'
import * as rules from './rules'
import { convertHeaders, checkRedirect, checkStatus } from './helpers'

export default function ({ log = {} }) {
  const { pages = [], entries = [] } = log
  let dns = {}
  let http2Requests = 0
  let isPage = false
  let page = pages[0]
  let totalBytes = 0
  let totalRedirects = 0
  const parsedEntries = entries.map((entry, idx) => {
    const req = entry.request
    const res = entry.response
    const reqHeaders = convertHeaders(req.headers)
    const resHeaders = convertHeaders(res.headers)
    const url = parseUrl(req.url)
    const hostname = url.hostname
    const status = res.status
    const ip = entry.serverIPAddress
    const content = res.content
    const size = content.size
    // Fake spdy -> http/2 Chrome headless bug
    // https://groups.google.com/a/chromium.org/forum/#!topic/headless-dev/lysNMNgqFrI
    const httpVersion = res.httpVersion.replace('spdy', 'http/2')
    const isHttp2 = /http\/2/i.test(httpVersion)
    const isHtml = /text\/html/i.test(content.mimeType)
    const isRedirect = checkRedirect(status)
    const isValid = checkStatus(status)
    // Capture all domains
    dns[hostname] = ip
    // Capture all HTTP/2 requests
    if (isHttp2) {
      http2Requests += 1
    }
    // Capture all redirects
    if (isRedirect) {
      totalRedirects += 1
    }
    // Capture total byte size
    if (size) {
      totalBytes += size
    }
    const newEntry = {
      bodySize: res.bodySize,
      content: content,
      hostname: hostname,
      httpVersion: httpVersion,
      ip: ip,
      isHttp2: isHttp2,
      isRedirect: isRedirect,
      isValid: isValid,
      redirectUrl: res.redirectURL,
      reqHeaders: reqHeaders,
      resHeaders: resHeaders,
      startedDateTime: entry.startedDateTime,
      status: status,
      time: entry.time,
      timings: entry.timings,
      url: url
    }
    // Set page entry
    if (isHtml && !isRedirect && !isPage) {
      page = {
        ...newEntry,
        pageTimings: {
          ...page.pageTimings,
          onFirstByte: entry.timings.wait
        }
      }
      isPage = true
    }
    return newEntry
  })
  const parsedPage = {
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
    totalBytes: totalBytes,
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
  const parsedResult = { page: parsedPage, entries: parsedEntries }
  // Analysis object
  const analysis = {
    page: parsedPage,
    rules: Object.keys(rules).reduce((obj, rule) => {
      obj[rule] = rules[rule](parsedResult)
      return obj
    }, {})
  }
  console.log(analysis.page)
  console.log(analysis.rules)
  return analysis
}
