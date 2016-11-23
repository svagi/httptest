import capturer from 'chrome-har-capturer'
import log from './debug'
import analyze from './analysis/analyze'

export default function createWorker ({ cache, chromeConfig, interval, ttl }) {
  const worker = {
    async processQueue () {
      const url = await cache.rpop('queue')
      if (url === null) {
        return setTimeout(worker.processQueue, interval)
      } else {
        try {
          worker.analyzeUrl(url)
        } catch (err) {
          log.error(err)
        }
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
            cache.publish(`har-done:${url}`, json)
            resolve({ url: url, data: data, json: json })
          })
      })
      cache.publish(`analysis-start:${url}`, null)
      const result = analyze(har.data)
      if (result) {
        const analysis = JSON.stringify(result)
        cache.publish(`analysis-done:${url}`, analysis)
        await cache.setex(`analysis:${url}`, ttl, analysis)
      } else {
        cache.publish(`analysis-error:${url}`, null)
      }
    }
  }
  return worker
}
