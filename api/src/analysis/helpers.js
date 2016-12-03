// Mime-type regexes
export const regex = {
  text: /text\/(?:plain|html|css|javascript)|application\/(?:javascript|json|ld\+json|xml|atom\+xml)/i,
  jsOrCss: /text\/(?:css|javascript)|application\/javascript/i,
  htmlOrJsOrCss: /text\/(?:html|css|javascript)|application\/javascript/i,
  encoding: /compress|gzip|deflate|bzip2/i
}

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

// Get first value from array
export function first (array = []) {
  return array[0]
}

// Calculate addition of two values
export function add (a, b) {
  return a + b
}

// Calculate sum of multiple values from array
export function sum (array = []) {
  return array.reduce(add, 0)
}

// Calculate product of two values
export function product (a, b) {
  return a * b
}

// Calculate product of multiple values from array
export function mul (array = []) {
  return array.reduce(product, 1)
}

// Calculate weighted arithmetic mean
export function weightedMean (array = []) {
  return sum(array.map(mul)) / sum(array.map(first))
}

// Remove all whitespace characters except single spaces
export function minifyWhitespace (str) {
  return str.replace(/[\t\n\r]+/g, '').replace(/ +/g, ' ')
}
