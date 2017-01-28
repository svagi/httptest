import capturer from 'chrome-har-capturer'
import { events } from './events'
import analyze from './analysis/analyze'
import log from './debug'

export default function createWorker (opts) {
  const { cache, analyses, rankings, chromeConfig, ttl, verbose } = opts
  const worker = {
    async processQueue () {
      try {
        // it blocks the connection indefinitely when there are no elements
        const url = (await cache.brpop('queue', 0))[1]
        cache.publish(events.QUEUE_POP, url)
        await worker.analyzeUrl(url)
      } catch (err) {
        log.error(err)
      }
      cache.publish(events.QUEUE_NEXT, null)
      return worker.processQueue()
    },
    async analyzeUrl (url) {
      const handleError = (err) => {
        log.debug(err)
        cache.publish(events.ANALYSIS_ERROR, JSON.stringify({
          status: 'error',
          url: url
        }))
      }
      // Start loading URL in chrome
      const har = await new Promise((resolve) => {
        capturer.setVerbose(verbose)
        capturer.load([url], chromeConfig)
          .on('error', handleError)
          .on('pageError', handleError)
          .on('connect', function () {
            cache.publish(events.HAR_START, url)
          })
          .on('end', function (data) {
            resolve(data)
            cache.publish(events.HAR_DONE, url)
          })
      })
      cache.publish(events.ANALYSIS_START, url)
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
          cache.publish(events.ANALYSIS_DONE, json)
        } else {
          cache.publish(events.ANALYSIS_ERROR, JSON.stringify({
            status: 'error',
            message: `Sorry, the page can not be analyzed. (status code: ${status})`,
            url: url
          }))
        }
      } else {
        cache.publish(events.ANALYSIS_ERROR, JSON.stringify({
          status: 'error',
          url: url
        }))
      }
    }
  }
  return worker
}
