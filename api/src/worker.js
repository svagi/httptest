import capturer from 'chrome-har-capturer'
// import log from './debug'
import analyze from './analysis/analyze'

export default function createWorker ({ cache, chromeConfig, interval }) {
  const worker = {
    async processQueue () {
      const url = await cache.rpop('queue')
      if (url === null) {
        return setTimeout(worker.processQueue, interval)
      } else {
        worker.analyzeUrl(url)
        return setImmediate(worker.processQueue)
      }
    },
    async analyzeUrl (url) {
      // Start loading URL in chrome
      cache.publish(`queue-pop:${url}`, null)
      const har = await new Promise((resolve, reject) => {
        capturer.load([url], chromeConfig)
          .on('error', reject)
          .on('connect', function () {
            cache.publish(`har-start:${url}`, null)
          })
          .on('end', function (data) {
            const json = JSON.stringify(data)
            resolve({ url: url, data: data, json: json })
            cache.publish(`har-done:${url}`, json)
          })
      })
      cache.publish(`analysis-start:${url}`, null)
      const analysis = JSON.stringify(analyze(har.data))
      cache.publish(`analysis-done:${url}`, analysis)
      await cache.set(`analysis:${url}`, analysis)
      return analysis
    }
  }
  return worker
}
