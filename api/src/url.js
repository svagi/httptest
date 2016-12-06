import { parse, format } from 'url'

/**
 * Parse the url and remove auth, query and hash components
 * string -> object
 */
export function parseUrl (url) {
  const parser = parse(url)
  parser.auth = ''
  parser.search = ''
  parser.hash = ''
  parser.formatted = format(parser)
  return parser
}
