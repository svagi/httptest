import capturer from 'chrome-har-capturer'
import log from './debug'
import analyze from './analysis/analyze'

export default function createWorker (opts) {
  const { cache, analyses, rankings, chromeConfig, interval, ttl, verbose } = opts
  const worker = {
    async processQueue () {
      // it blocks the connection indefinitely when there are no elements
      const result = await cache.brpop('queue', 0)
      if (result) {
        const url = result[1]
        cache.publish(`queue-pop:${url}`, null)
        try {
          await worker.analyzeUrl(url)
        } catch (err) {
          log.error(err)
        }
        cache.publish(`queue-next`, null)
        return worker.processQueue()
      } else {
        return setTimeout(worker.processQueue, interval)
      }
    },
    async analyzeUrl (url) {
      const handleError = (err) => {
        log.debug(err)
        cache.publish(`analysis-error:${url}`, null)
      }
      // Start loading URL in chrome
      const har = await new Promise((resolve) => {
        capturer.setVerbose(verbose)
        capturer.load([url], chromeConfig)
          .on('error', handleError)
          .on('pageError', handleError)
          .on('connect', function () {
            cache.publish(`har-start:${url}`, null)
          })
          .on('end', function (data) {
            cache.publish(`har-done:${url}`, JSON.stringify(data))
            resolve(data)
          })
      })
      cache.publish(`analysis-start:${url}`, null)
      const analysis = analyze(har)
      if (analysis) {
        const json = JSON.stringify(analysis)
        Promise.all([
          analyses.save(url, analysis),
          rankings.save(url, analysis.totalScore),
          cache.setex(`analysis:${url}`, ttl, json)
        ])
        cache.publish(`analysis-done:${url}`, json)
      } else {
        cache.publish(`analysis-error:${url}`, null)
      }
    }
  }
  return worker
}
