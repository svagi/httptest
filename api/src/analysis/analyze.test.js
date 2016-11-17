import test from 'ava'
import analyze from './analyze'
import { datasets, domains } from './datasets'

// All domains
domains.forEach((domain) => datasets[domain].forEach((har, idx) => {
  const analysis = analyze(har)
  test(`[${idx}|${domain}] analysis is object`, (t) => {
    t.is(typeof analysis, 'object')
  })

  test(`[${idx}|${domain}] page as property of analysis is object`, (t) => {
    t.is(typeof analysis.page, 'object')
  })

  test(`[${idx}|${domain}] page.totalRequests is number greater or equeal to zero`, (t) => {
    t.true(analysis.page.totalRequests >= 0)
  })

  test(`[${idx}|${domain}] page.totalRedirects is number greater or equeal to zero`, (t) => {
    t.true(analysis.page.totalRedirects >= 0)
  })

  test(`[${idx}|${domain}] page.isLandingHttp2 property is boolean`, (t) => {
    t.is(typeof analysis.page.isHttp2, 'boolean')
  })

  test(`[${idx}|${domain}] page.http2Requests is number greater or equeal to zero`, (t) => {
    t.true(analysis.page.http2Requests >= 0)
  })

  test(`[${idx}|${domain}] page.totalBytes is number greater or equeal to zero`, (t) => {
    t.is(typeof analysis, 'object')
  })

  test(`[${idx}|${domain}] page.domLoadTime is number greater or equeal to zero or -1`, (t) => {
    t.true(analysis.page.domLoadTime >= 0)
  })

  test(`[${idx}|${domain}] page.loadTime is number greater or equeal to zero or -1`, (t) => {
    t.true(analysis.page.loadTime >= 0)
  })
}))
