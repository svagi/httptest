import log from './debug'

function normalizeZscoreResults (keys, results) {
  return keys.reduce(function (obj, key, idx) {
    obj[key] = +results[idx][1]
    return obj
  }, {})
}

function normalizeZrangeResults (results) {
  return results.reduce(function (obj, val, idx, arr) {
    if (idx & 1) obj[arr[idx - 1]] = +val
    return obj
  }, {})
}

function createRankings (cache) {
  const keySorted = 'rankings:sorted'
  const totalsKeys = [
    '90 – 100',
    '80 – 90',
    '70 – 80',
    '60 – 70',
    '50 – 60',
    '40 – 50',
    '30 – 40',
    '20 – 30',
    '10 – 20',
    '0 – 10'
  ]
  const rankings = {
    save (url, score) {
      return cache.pipeline()
        .lrem('rankings:latest', 1, url)
        .lpush('rankings:latest', url)
        .ltrim('rankings:latest', 0, 9)
        .zadd(keySorted, score, url)
        .exec()
    },
    async getLatest () {
      const urls = await cache.lrange('rankings:latest', 0, 9)
      let pipe = cache.pipeline()
      urls.forEach(url => {
        pipe = pipe.zscore(keySorted, url)
      })
      return pipe.exec()
        .then(results => normalizeZscoreResults(urls, results))
    },
    getBest () {
      return cache.zrevrange(keySorted, 0, 9, 'WITHSCORES')
        .then(normalizeZrangeResults)
    },
    getWorst () {
      return cache.zrange(keySorted, 0, 9, 'WITHSCORES')
        .then(normalizeZrangeResults)
    },
    async getTotals () {
      const results = await cache.pipeline()
        .zcount(keySorted, 90, 100)
        .zcount(keySorted, 80, 90)
        .zcount(keySorted, 70, 80)
        .zcount(keySorted, 60, 70)
        .zcount(keySorted, 50, 60)
        .zcount(keySorted, 40, 50)
        .zcount(keySorted, 30, 40)
        .zcount(keySorted, 20, 30)
        .zcount(keySorted, 10, 20)
        .zcount(keySorted, 0, 10)
        .exec()
      return normalizeZscoreResults(totalsKeys, results)
    }
  }
  return rankings
}

function createRateLimit (cache) {
  return {
    async check (ip, rate, period) {
      const timestamp = (Date.now() / (1000 * period)) | 0
      const key = `ratelimit:${timestamp}|${ip}`
      const used = +await cache.get(key) + 1
      const remaining = rate - used
      log.debug(`ratelimit [${ip}] -> ${used}/${rate}`)
      if (remaining) {
        await cache.pipeline()
          .incr(key)
          .expire(key, period)
          .exec()
      }
      return remaining
    }
  }
}

export default function (cache, opts = {}) {
  return {
    rankings: createRankings(cache),
    rateLimit: createRateLimit(cache)
  }
}
