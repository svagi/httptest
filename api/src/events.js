import log from './debug'

// Global events
export const events = {
  ANALYSIS_START: 'analysis-start',
  ANALYSIS_DONE: 'analysis-done',
  ANALYSIS_ERROR: 'analysis-error',
  HAR_START: 'har-start',
  HAR_DONE: 'har-done',
  QUEUE_POP: 'queue-pop',
  QUEUE_PUSH: 'queue-push',
  QUEUE_NEXT: 'queue-next',
  RANKINS_LATEST: 'rankings-latest',
  RANKINS_BEST: 'rankings-best',
  RANKINS_WORST: 'rankings-worst',
  RANKINS_TOTALS: 'rankings-totals'
}

// Express middleware
export function sse (req, res, next) {
  const TIMEOUT = 20 * 1000 // 20 sec
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
  const conn = res.sse = {
    open () {
      lastId = 0
      timer = setTimeout(conn.ping, TIMEOUT)
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // turn off proxy buffering
      })
      return conn
    },
    emit (event = 'message', data = 'null') {
      log.debug(`SSE: emit -> ${lastId}:${event}`)
      res.write('id: ' + lastId++ + '\n')
      res.write('event: ' + event + '\n')
      res.write('data: ' + data + '\n\n')
      return conn
    },
    ping () {
      conn.emit('ping')
      timer = setTimeout(conn.ping, TIMEOUT)
      return conn
    }
  }
  next()
}
