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
        cache.publish(`queue-pop`, url)
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
        cache.publish(`analysis-error`, url)
      }
      // Start loading URL in chrome
      const har = await new Promise((resolve) => {
        capturer.setVerbose(verbose)
        capturer.load([url], chromeConfig)
          .on('error', handleError)
          .on('pageError', handleError)
          .on('connect', function () {
            cache.publish(`har-start`, url)
          })
          .on('end', function (data) {
            resolve(data)
            cache.publish(`har-done`, url)
          })
      })
      cache.publish(`analysis-start`, url)
      const analysis = analyze(har)
      const status = analysis.page.status
      if (analysis) {
        if (status === 200) {
          analysis.url = url
          const json = JSON.stringify(analysis)
          await Promise.all([
            analyses.save(url, analysis),
            rankings.save(url, analysis.totalScore),
            cache.setex(`analysis:${url}`, ttl, json)
          ])
          cache.publish(`analysis-done`, json)
        } else {
          cache.publish(`analysis-error`, `Sorry, the page can not be analyzed. (status code: ${status})`)
        }
      } else {
        cache.publish(`analysis-error`, null)
      }
    }
  }
  return worker
}
