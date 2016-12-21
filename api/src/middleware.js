import { parseUrl } from './url'
import log from './debug'

export function accept (list) {
  return function (req, res, next) {
    if (!req.accepts(list)) {
      return res.status(406).end()
    }
    next()
  }
}

export function sseMiddleware (req, res, next) {
  if (!req.accepts('text/event-stream')) {
    return next()
  }
  const TIMEOUT = 15 * 1000
  let lastId
  let timer
  req.on('close', function () {
    log.debug('SSE: Client close connection')
    timer = clearTimeout(timer)
  })
  res.on('finish', function () {
    log.debug('SSE: Server finish connection')
    timer = clearTimeout(timer)
  })
  const sse = res.sse = {
    open () {
      lastId = 0
      timer = setTimeout(sse.ping, TIMEOUT)
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // turn off proxy buffering
      })
      return sse
    },
    emit (event = 'message', data = 'null') {
      log.debug(`SSE: emit -> ${lastId}:${event}`)
      res.write('id: ' + lastId++ + '\n')
      res.write('event: ' + event + '\n')
      res.write('data: ' + data + '\n\n')
      return sse
    },
    ping () {
      sse.emit('ping')
      timer = setTimeout(sse.ping, TIMEOUT)
      return sse
    }
  }
  next()
}
