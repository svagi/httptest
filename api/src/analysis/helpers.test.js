import test from 'ava'
import { datasets, domains } from './datasets'
import * as helpers from './helpers'

domains.forEach(domain => datasets[domain].forEach((har, idx) => {
  test(`[${idx}|${domain}] Convert array headers to object headers`, (t) => {
    const arrayHeaders = har.log.entries[0].request.headers
    const objectHeaders = helpers.convertHeaders(arrayHeaders)
    t.is(typeof objectHeaders, 'object')
    t.is(arrayHeaders.length, Object.keys(objectHeaders).length)
  })
}))

test('Normalize score value', (t) => {
  t.is(helpers.normalizeScore(-100), 0)
  t.is(helpers.normalizeScore(-100, { min: -100 }), -100)
  t.is(helpers.normalizeScore(200), 100)
  t.is(helpers.normalizeScore(200, { max: 200 }), 200)
})

test('Parse max-age from Cache-Control header', (t) => {
  t.is(helpers.parseMaxAge('max-age=0'), 0)
  t.is(helpers.parseMaxAge('max-age=0, must-revalidate'), 0)
  t.is(helpers.parseMaxAge('max-age=315360000'), 315360000)
  t.falsy(helpers.parseMaxAge('no-cache'))
})

test('Parse Date header', (t) => {
  t.is(helpers.parseDate('Wed, 04 May 2016 15:54:41 GMT'), 1462377281000)
  t.is(helpers.parseDate('Wed, 04 May 2016'), 1462320000000)
  t.falsy(helpers.parseDate('falsy'))
  t.falsy(helpers.parseDate(''))
})

test('Check redirect by status code', (t) => {
  t.true(helpers.checkRedirect(301))
  t.true(helpers.checkRedirect(302))
  t.false(helpers.checkRedirect(304))
  t.true(helpers.checkRedirect(307))
})

test('Unique array values', (t) => {
  t.deepEqual(helpers.uniqArray([1, 2, 2]), [1, 2])
  t.deepEqual(helpers.uniqArray(['a', 'b', 'a']), ['a', 'b'])
})
