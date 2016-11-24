
function normalizeZscoreResults (keys, results) {
  return keys.reduce(function (obj, key, idx) {
    obj[key] = +results[idx][1]
    return obj
  }, {})
}

function normalizeZrangeResults (results) {
  return results.reduce(function (obj, val, idx, arr) {
    if (idx % 2) obj[arr[idx - 1]] = +val
    return obj
  }, {})
}

export function createRankings (cache) {
  const rankings = {
    async save (url, score) {
      return await cache.pipeline()
        .lrem('rankings:latest', 1, url)
        .lpush('rankings:latest', url)
        .ltrim('rankings:latest', 0, 9)
        .zadd('rankings:sorted', score, url)
        .exec()
    },
    async getLatest () {
      let pipe = cache.pipeline()
      const urls = await cache.lrange('rankings:latest', 0, 9)
      urls.forEach(url => pipe = pipe.zscore('rankings:sorted', url))
      const results = await pipe.exec()
      return normalizeZscoreResults(urls, results)
    },
    async getBest () {
      const results = await cache.zrevrange('rankings:sorted', 0, 9, 'WITHSCORES')
      return normalizeZrangeResults(results)
    },
    async getWorst () {
      const results = await cache.zrange('rankings:sorted', 0, 9, 'WITHSCORES')
      return normalizeZrangeResults(results)
    },
    async getTotals () {
      const key = 'rankings:sorted'
      const results = await cache.pipeline()
        .zcount(key, 90, 100)
        .zcount(key, 80, 90)
        .zcount(key, 70, 80)
        .zcount(key, 60, 70)
        .zcount(key, 50, 60)
        .zcount(key, 40, 50)
        .zcount(key, 30, 40)
        .zcount(key, 20, 30)
        .zcount(key, 10, 20)
        .zcount(key, 0, 10)
        .exec()
      const keys = [
        '90-100',
        '80-90',
        '70-80',
        '60-70',
        '50-60',
        '40-50',
        '30-40',
        '20-30',
        '10-20',
        '0-10'
      ]
      return normalizeZscoreResults(keys, results)
    },
    async getAll () {
      return {
        best: await rankings.getBest(),
        latest: await rankings.getLatest(),
        worst: await rankings.getWorst(),
        totals: await rankings.getTotals()
      }
    }
  }
  return rankings
}
