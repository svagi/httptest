/*
* Server-sent events
* Low level API
*/
module.exports = function createSSE (res) {
  return {
    open() {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      })
    },
    emit(type, data) {
      console.log(type + ': ' + data + '\n')
      res.write(type + ': ' + data + '\n')
    },
    close() {
      res.end()
    }
  }
}
