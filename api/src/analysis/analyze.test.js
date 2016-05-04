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

test('[all] stats as property of analysis is object', (t) => {
  domains.forEach((domain) => {
    t.is(typeof analysis['http://seznam.cz'].stats, 'object')
  })
})

test('[all] stats.totalRequests is number greater or equeal to zero', (t) => {
  domains.forEach((domain) => {
    t.true(analysis['http://seznam.cz'].stats.totalRequests >= 0)
  })
})

test('[all] stats.totalRedirects is number greater or equeal to zero', (t) => {
  domains.forEach((domain) => {
    t.true(analysis['http://seznam.cz'].stats.totalRedirects >= 0)
  })
})

test('[all] stats.isLandingRedirected property is boolean', (t) => {
  domains.forEach((domain) => {
    t.is(typeof analysis['http://seznam.cz'].stats.isLandingRedirected, 'boolean')
  })
})

test('[all] stats.isLandingHttp2 property is boolean', (t) => {
  domains.forEach((domain) => {
    t.is(typeof analysis['http://seznam.cz'].stats.isLandingHttp2, 'boolean')
  })
})

test('[all] stats.http2Requests is number greater or equeal to zero', (t) => {
  domains.forEach((domain) => {
    t.true(analysis['http://seznam.cz'].stats.http2Requests >= 0)
  })
})

test('[all] stats.totalBytes is number greater or equeal to zero', (t) => {
  domains.forEach((domain) => {
    t.true(analysis['http://seznam.cz'].stats.totalBytes >= 0)
  })
})

test('[all] stats.domLoadTime is number greater or equeal to zero', (t) => {
  domains.forEach((domain) => {
    t.true(analysis['http://seznam.cz'].stats.domLoadTime >= 0)
  })
})

test('[all] stats.loadTime is number greater or equeal to zero', (t) => {
  domains.forEach((domain) => {
    t.true(analysis['http://seznam.cz'].stats.loadTime >= 0)
  })
})

test('[all] stats.domains is array', (t) => {
  domains.forEach((domain) => {
    t.true(Array.isArray(analysis['http://seznam.cz'].stats.allDomains))
  })
})

// Only http://seznam.cz
test('[http://seznam.cz] stats.totalRequests is 69', (t) => {
  t.is(analysis['http://seznam.cz'].stats.totalRequests, 69)
})

test('[http://seznam.cz] stats.totalRedirects is 1', (t) => {
  t.is(analysis['http://seznam.cz'].stats.totalRedirects, 1)
})

test('[http://seznam.cz] stats.isLandingRedirected is true', (t) => {
  t.true(analysis['http://seznam.cz'].stats.isLandingRedirected)
})

test('[http://seznam.cz] stats.isLandingHttp2 is false', (t) => {
  t.false(analysis['http://seznam.cz'].stats.isLandingHttp2)
})

// Only http://svager.cz
test('[http://svager.cz] stats.totalRequests is 5', (t) => {
  t.is(analysis['http://svager.cz'].stats.totalRequests, 5)
})

test('[http://svager.cz] stats.totalRedirects is 1', (t) => {
  t.is(analysis['http://svager.cz'].stats.totalRedirects, 1)
})

test('[http://svager.cz] stats.isLandingRedirected is true', (t) => {
  t.true(analysis['http://svager.cz'].stats.isLandingRedirected)
})

test('[http://svager.cz] stats.isLandingHttp2 is false', (t) => {
  t.true(analysis['http://svager.cz'].stats.isLandingHttp2)
})
