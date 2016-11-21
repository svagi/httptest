// Convert headers from array to object
export function convertHeaders (arrayHeaders) {
  return arrayHeaders.reduce((objHeaders, header) => {
    objHeaders[header['name'].toLowerCase()] = header['value']
    return objHeaders
  }, {})
}

// Normalize score value: min < score < max
export function normalizeScore (score, { min = 0, max = 100 } = {}) {
  if (!Number.isInteger(score)) return null
  return Math.max(min, Math.min(score, max))
}

// Normalize reason value
export function normalizeReason (reason, count) {
  return count > 0 ? reason : null
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

// Check if status code is non-error
export function checkStatus (status) {
  return status >= 200 && status < 400
}

// Make values of array unique
export function uniqArray (arr) {
  return [...new Set(arr)]
}

// Calculate sum of values from array
export function sum (array, startValue = 0) {
  return array.reduce((a, b) => a + b, startValue)
}
