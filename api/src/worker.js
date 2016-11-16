import Redis from 'ioredis'
import capturer from 'chrome-har-capturer'
import log from './debug'
import analyze from './analysis/analyze'

export default function createWorker ({ IS_DEV = false }) {
  const redis = new Redis({
    host: 'cache',
    showFriendlyErrorStack: IS_DEV
  })
  const chromeConfig = {
    host: 'chrome',
    port: 9222
  }
  let isProcessing = false
  return {
    processQueue () {
      if (isProcessing) return
      isProcessing = true
      redis.rpop('queue')
        .then(url => {
          // there is not url to analyze
          if (url === null) return Promise.reject('Empty queue')
          redis.publish(`queue-pop:${url}`, null)
          // Start loading URL in chrome
          redis.publish(`har-start:${url}`, null)
          return new Promise((resolve, reject) => {
            capturer.load([url], chromeConfig)
              .on('connect', function () {})
              .on('end', function (data) {
                const har = {
                  url: url,
                  data: data,
                  json: JSON.stringify(data)
                }
                resolve(har)
                redis.publish(`har-done:${url}`, har.json)
              })
              .on('error', reject)
          })
        })
        .then((har) => {
          const url = har.url
          redis.publish(`analysis-start:${url}`, null)
          const analysis = JSON.stringify(analyze(har.data))
          redis.publish(`analysis-done:${url}`, analysis)
          return redis.set(`analysis:${url}`, analysis).then(() => {
            isProcessing = false
          })
        })
        .catch(err => {
          isProcessing = false
          if (err !== 'Empty queue') log.error(err)
        })
    }
  }
}
