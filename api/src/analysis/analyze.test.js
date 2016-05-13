import test from 'ava'
import analyze from './analyze'
import { domains, mapDatasets } from './datasets'

const analysis = mapDatasets(analyze)

// All domains
test('[all] analysis is object', (t) => {
  domains.forEach((domain) => {
    t.is(typeof analysis['http://seznam.cz'], 'object')
  })
})

test('[all] page as property of analysis is object', (t) => {
  domains.forEach((domain) => {
    t.is(typeof analysis['http://seznam.cz'].page, 'object')
  })
})

test('[all] page.totalRequests is number greater or equeal to zero', (t) => {
  domains.forEach((domain) => {
    t.true(analysis['http://seznam.cz'].page.totalRequests >= 0)
  })
})

test('[all] page.totalRedirects is number greater or equeal to zero', (t) => {
  domains.forEach((domain) => {
    t.true(analysis['http://seznam.cz'].page.totalRedirects >= 0)
  })
})

test('[all] page.isLandingRedirected property is boolean', (t) => {
  domains.forEach((domain) => {
    t.is(typeof analysis['http://seznam.cz'].page.isRedirected, 'boolean')
  })
})

test('[all] page.isLandingHttp2 property is boolean', (t) => {
  domains.forEach((domain) => {
    t.is(typeof analysis['http://seznam.cz'].page.isHttp2, 'boolean')
  })
})

test('[all] page.http2Requests is number greater or equeal to zero', (t) => {
  domains.forEach((domain) => {
    t.true(analysis['http://seznam.cz'].page.http2Requests >= 0)
  })
})

test('[all] page.totalBytes is number greater or equeal to zero', (t) => {
  domains.forEach((domain) => {
    t.true(analysis['http://seznam.cz'].page.totalBytes >= 0)
  })
})

test('[all] page.domLoadTime is number greater or equeal to zero', (t) => {
  domains.forEach((domain) => {
    t.true(analysis['http://seznam.cz'].page.domLoadTime >= 0)
  })
})

test('[all] page.loadTime is number greater or equeal to zero', (t) => {
  domains.forEach((domain) => {
    t.true(analysis['http://seznam.cz'].page.loadTime >= 0)
  })
})

test('[all] page.domains is array', (t) => {
  domains.forEach((domain) => {
    t.true(Array.isArray(analysis['http://seznam.cz'].page.allDomains))
  })
})

// Only http://seznam.cz
test('[http://seznam.cz] page.totalRequests is 69', (t) => {
  t.is(analysis['http://seznam.cz'].page.totalRequests, 69)
})

test('[http://seznam.cz] page.totalRedirects is 1', (t) => {
  t.is(analysis['http://seznam.cz'].page.totalRedirects, 1)
})

test('[http://seznam.cz] page.isLandingRedirected is true', (t) => {
  t.true(analysis['http://seznam.cz'].page.isRedirected)
})

test('[http://seznam.cz] page.isLandingHttp2 is false', (t) => {
  t.false(analysis['http://seznam.cz'].page.isHttp2)
})

test('[http://seznam.cz] reduceRedirects', (t) => {
  const result = analysis['http://seznam.cz'].rules.reduceRedirects
  t.is(result.score, 75)
  t.deepEqual(result.values, [ '(302) http://seznam.cz/ -> https://www.seznam.cz/' ])
})

// Only http://svager.cz
test('[http://svager.cz] page.totalRequests is 5', (t) => {
  t.is(analysis['http://svager.cz'].page.totalRequests, 5)
})

test('[http://svager.cz] page.totalRedirects is 1', (t) => {
  t.is(analysis['http://svager.cz'].page.totalRedirects, 1)
})

test('[http://svager.cz] page.isLandingRedirected is true', (t) => {
  t.true(analysis['http://svager.cz'].page.isRedirected)
})

test('[http://svager.cz] page.isLandingHttp2 is false', (t) => {
  t.true(analysis['http://svager.cz'].page.isHttp2)
})

test('[http://svager.cz] reduceRedirects', (t) => {
  const result = analysis['http://svager.cz'].rules.reduceRedirects
  t.is(result.score, 75)
  t.deepEqual(result.values, [ '(301) http://svager.cz/ -> https://www.svager.cz/' ])
})
