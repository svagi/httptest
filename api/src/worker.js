import capturer from 'chrome-har-capturer'
// import log from './debug'
import analyze from './analysis/analyze'

export default function createWorker ({ cache, chromeConfig }) {
  let isProcessing = false
  return {
    async processQueue () {
      if (isProcessing) return
      isProcessing = true
      const url = await cache.rpop('queue')
      // there is not url to analyze
      if (url === null) {
        isProcessing = false
        return
      }
      // Start loading URL in chrome
      cache.publish(`queue-pop:${url}`, null)
      const har = await new Promise((resolve) => {
        capturer.load([url], chromeConfig)
          .on('connect', function () {
            cache.publish(`har-start:${url}`, null)
          })
          .on('end', function (data) {
            const json = JSON.stringify(data)
            resolve({
              url: url,
              data: data,
              json: json
            })
            cache.publish(`har-done:${url}`, json)
          })
      })
      cache.publish(`analysis-start:${url}`, null)
      const analysis = JSON.stringify(analyze(har.data))
      cache.publish(`analysis-done:${url}`, analysis)
      cache.set(`analysis:${url}`, analysis)
      isProcessing = false
    }
  }
}
