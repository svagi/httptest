// Convert headers from array to object
export function convertHeaders (arrayHeaders) {
  return arrayHeaders.reduce((objHeaders, header) => {
    objHeaders[header['name']] = header['value']
    return objHeaders
  }, {})
}

export default function (har) {
  const stats = {
    requests: har.log.entries.length,
    totalBytes: 0,
    loadTime: 0
  }
  const page = har.log.pages[0]

  har.log.entries.forEach((entry) => {
    // Calculate byte size of all requests
    const { headersSize, bodySize } = entry.response
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

  // Convert loadTime [datetime] to milisecods subtracting page.startedDateTime
  stats.loadTime -= new Date(page.startedDateTime).getTime()

  return {
    stats: stats
  }
}
