/*
* Server-sent events
* Low level API
*/
export default function createSSE (app) {
  // SSE sockets
  app.locals.sse = {}
  // Middleware
  return function middleware (req, res, next) {
    // Init private variables
    let id = 0
    let key = ''
    let intervalId
    let timeoutId
    // Clear timers on close connection
    req.on('close', function close () {
      clearInterval(intervalId)
      clearTimeout(timeoutId)
      delete app.locals.sse[key]
    })
    // Open sse connection
    // string:sse_key -> object:res
    res.open = function open (sse_key) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      })
      key = sse_key
      app.locals.sse[key] = res
      timeoutId = setInterval(() => {
        res.end()
      }, 120000) // 2min
      return res
    }
    // Get response object by sse key
    // string:sse_key -> object:res
    res.getSSE = function getSSE (sse_key) {
      return app.locals.sse[sse_key]
    }
    // Emit data to client
    // string:event, string:data -> object:res
    res.emit = function emit (event, data = '') {
      res.write('id: ' + (++id) + '\n')
      res.write('event: ' + event + '\n')
      res.write('data: ' + data + '\n\n')
      intervalId = setInterval(() => {
        res.write('data: ping\n\n')
      }, 30000) // 30s
      return res
    }
    next()
  }
}
