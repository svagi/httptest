import test from 'ava'
import datasets from './datasets'
import * as helpers from './helpers'

const har = datasets['http://seznam.cz']

test('convert array headers to object headers', (t) => {
  const arrayHeaders = har.log.entries[0].request.headers
  const objectHeaders = helpers.convertHeaders(arrayHeaders)
  t.is(typeof objectHeaders, 'object')
  t.is(arrayHeaders.length, Object.keys(objectHeaders).length)
})

test('Normalize score value', (t) => {
  t.is(helpers.normalizeScore(-100), 0)
  t.is(helpers.normalizeScore(-100, { min: -100 }), -100)
  t.is(helpers.normalizeScore(200), 100)
  t.is(helpers.normalizeScore(200, { max: 200 }), 200)
})

test('parse max-age from Cache-Control header', (t) => {
  t.is(helpers.parseMaxAge('max-age=0'), 0)
  t.is(helpers.parseMaxAge('max-age=0, must-revalidate'), 0)
  t.is(helpers.parseMaxAge('max-age=315360000'), 315360000)
  t.falsy(helpers.parseMaxAge('no-cache'))
})

test('parse Date header', (t) => {
  t.is(helpers.parseDate('Wed, 04 May 2016 15:54:41 GMT'), 1462377281000)
  t.is(helpers.parseDate('Wed, 04 May 2016'), 1462320000000)
  t.falsy(helpers.parseDate('falsy'))
  t.falsy(helpers.parseDate(''))
})
