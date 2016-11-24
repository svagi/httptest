import capturer from 'chrome-har-capturer'
import log from './debug'
import analyze from './analysis/analyze'

export default function createWorker (opts) {
  const { cache, rankings, chromeConfig, interval, ttl, verbose } = opts
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
      const handleError = (err) => {
        log.debug(err)
        cache.publish(`analysis-error:${url}`, null)
      }
      // Start loading URL in chrome
      cache.publish(`queue-pop:${url}`, null)
      const har = await new Promise((resolve) => {
        capturer.setVerbose(verbose)
        capturer.load([url], chromeConfig)
          .on('error', handleError)
          .on('pageError', handleError)
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
      const analysis = analyze(har.data)
      if (analysis) {
        const json = JSON.stringify(analysis)
        cache.publish(`analysis-done:${url}`, json)
        // TODO save the analysis in a different storage (CouchDB?)
        await cache.setex(`analysis:${url}`, ttl, json)
        await rankings.save(url, analysis.totalScore)
      } else {
        cache.publish(`analysis-error:${url}`, null)
      }
      cache.publish(`queue-next`, null)
    }
  }
  return worker
}
