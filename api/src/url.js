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
    parser.auth = ''
    parser.search = ''
    parser.hash = ''
    Object.defineProperty(parser, 'formatted', {
      get () {
        return format(parser)
      }
    })
    Object.defineProperty(parser, 'encoded', {
      get () {
        return encodeURIComponent(parser.formatted)
      }
    })
    return parser
  }
}
