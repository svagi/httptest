import { parse, format } from 'url'
import { isWebUri } from 'valid-url'

/**
 * Parse the url and remove auth, query and hash components
 * string -> object || undefined
 */
export function parseUrl (originalUrl) {
  const url = isWebUri(originalUrl)
  if (url) {
    const parser = parse(url)
    const formatted = format(parser)
    parser.auth = ''
    parser.search = ''
    parser.hash = ''
    parser.formatted = formatted
    parser.encoded = encodeURIComponent(formatted)
    return parser
  }
}
