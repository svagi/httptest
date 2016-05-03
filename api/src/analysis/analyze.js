// Convert headers from array to object
export function convertHeaders (arrayHeaders) {
  return arrayHeaders.reduce((objHeaders, header) => {
    objHeaders[header['name'].toLowerCase()] = header['value']
    return objHeaders
  }, {})
}

export default function (har) {
  const stats = {
    totalRequests: har.log.entries.length,
    totalRedirects: 0,
    http2Requests: 0,
    totalBytes: 0,
    domLoadTime: 0,
    loadTime: 0,
    domains: new Set()
  }
  let page = har.log.pages[0]

  har.log.entries.forEach((entry) => {
    const req = entry.request
    const res = entry.response
    const reqHeaders = convertHeaders(req.headers)

    // Add all host names to set
    stats.domains.add(reqHeaders['host'])

    // Total number of redirects
    if ([301, 302, 307].indexOf(res.status) > -1) {
      stats.totalRedirects += 1
    }

    // Total number of HTTP/2 requests
    const httpVersion = res.httpVersion
    if (httpVersion && /HTTP\/2/.test(httpVersion)) {
      stats.http2Requests += 1
    }

    // Calculate byte size of all requests
    const { headersSize, bodySize } = res
    if (headersSize > 0) {
      stats.totalBytes += headersSize
    }
    if (bodySize > 0) {
      stats.totalBytes += bodySize
    }
    // Calculate page load time by maximum entry time
    const { startedDateTime, time } = entry
    const entryTime = new Date(startedDateTime).getTime() + time
    if (stats.loadTime < entryTime) {
      stats.loadTime = entryTime
    }
  })

  // Convert domains to array
  stats.domains = [...stats.domains]

  // Convert loadTime [datetime] to milisecods subtracting page.startedDateTime
  stats.loadTime -= new Date(page.startedDateTime).getTime()

  // Set page timings from performance.timing if exists
  if (page.pageTimings.onContentLoad > 0) {
    stats.domLoadTime = page.pageTimings.onContentLoad
  }
  if (page.pageTimings.onLoad > 0) {
    stats.loadTime = page.pageTimings.onLoad
  }
  if (stats.domLoadTime === -1) {
    stats.domLoadTime = undefined
  }
  if (stats.loadTime === -1) {
    stats.loadTime = undefined
  }

  console.log(stats)

  return {
    stats: stats
  }
}
