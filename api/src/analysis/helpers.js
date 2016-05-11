// Convert headers from array to object
export function convertHeaders (arrayHeaders) {
  return arrayHeaders.reduce((objHeaders, header) => {
    objHeaders[header['name'].toLowerCase()] = header['value']
    return objHeaders
  }, {})
}

// Normalize score value
export function normalizeScore (score, opts = {}) {
  const { min = 0, max = 100 } = opts
  if (!Number.isInteger(score)) return null
  if (score < min) score = min
  if (score > max) score = max
  return score
}

// Parse max-age from Cache-Control header
export function parseMaxAge (headerVal = '') {
  const maxAge = (headerVal.match(/max-age=(\d+)/) || [])[1]
  return maxAge ? parseInt(maxAge, 10) : undefined
}

// Parse date header
export function parseDate (headerVal) {
  return headerVal ? new Date(headerVal).getTime() : undefined
}

// Check is status code is redirect
export function checkRedirect (status) {
  return [301, 302, 307].indexOf(status) > -1
}

// Make values of array unique
export function uniqArray (arr) {
  return [...new Set(arr)]
}
