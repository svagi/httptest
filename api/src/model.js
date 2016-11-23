
function normalizeZscoreResults (urls, results) {
  return urls.reduce(function (obj, url, idx) {
    obj[url] = results[idx][1]
    return obj
  }, {})
}

function normalizeZrangeResults (results) {
  return results.reduce(function (obj, val, idx, arr) {
    if (idx % 2) obj[arr[idx - 1]] = val
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
    async getAll () {
      return {
        best: await rankings.getBest(),
        latest: await rankings.getLatest(),
        worst: await rankings.getWorst()
      }
    }
  }
  return rankings
}
