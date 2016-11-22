import test from 'ava'
import { datasets, domains } from './datasets'
import * as helpers from './helpers'

test('Test all regexes', (t) => {
  const { text, jsOrCss, encoding } = helpers.regex
  // text
  t.false(text.test(''))
  t.true(text.test('text/plain'))
  t.true(text.test('text/html'))
  t.true(text.test('text/css'))
  t.true(text.test('text/javascript'))
  t.false(text.test('text/x-unknown'))
  t.true(text.test('application/javascript'))
  t.true(text.test('application/json'))
  t.true(text.test('application/ld+json'))
  t.true(text.test('application/xml'))
  t.true(text.test('application/atom+xml'))
  t.false(text.test('application/x-unknown'))
  // js or css
  t.false(jsOrCss.test(''))
  t.true(jsOrCss.test('text/javascript'))
  t.true(jsOrCss.test('text/css'))
  t.false(jsOrCss.test('text/x-unknown'))
  t.true(jsOrCss.test('application/javascript'))
  t.false(jsOrCss.test('application/x-unknown'))
  // encoding
  t.false(encoding.test(''))
  t.true(encoding.test('compress'))
  t.true(encoding.test('gzip'))
  t.true(encoding.test('deflate'))
  t.true(encoding.test('bzip2'))
})

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

test('Check non-error status code', (t) => {
  t.false(helpers.checkStatus(199))
  t.true(helpers.checkStatus(200))
  t.true(helpers.checkStatus(201))
  t.true(helpers.checkStatus(304))
  t.true(helpers.checkStatus(307))
  t.false(helpers.checkStatus(400))
})

test('Unique array values', (t) => {
  t.deepEqual(helpers.uniqArray([1, 2, 2]), [1, 2])
  t.deepEqual(helpers.uniqArray(['a', 'b', 'a']), ['a', 'b'])
})

test('First value from an array', (t) => {
  t.is(helpers.first(), undefined)
  t.is(helpers.first([]), undefined)
  t.is(helpers.first([1]), 1)
  t.is(helpers.first([1, 2]), 1)
})

test('Addition of two values', (t) => {
  t.is(helpers.add(0, 1), 1)
  t.is(helpers.add(1, 2), 3)
  t.is(helpers.add(-1, 1), 0)
})

test('Product of two values', (t) => {
  t.is(helpers.product(0, 1), 0)
  t.is(helpers.product(1, 2), 2)
  t.is(helpers.product(-1, 1), -1)
})

test('Sum from array of values', (t) => {
  t.is(helpers.sum(), 0)
  t.is(helpers.sum([]), 0)
  t.is(helpers.sum([1, 2]), 3)
  t.is(helpers.sum([1, null, 2]), 3)
  t.is(helpers.sum([1, 2, 3]), 6)
  t.is(helpers.sum([-1, 2, 3]), 4)
})

test('Product from array of values', (t) => {
  t.is(helpers.mul(), 1)
  t.is(helpers.mul([]), 1)
  t.is(helpers.mul([1, 2]), 2)
  t.is(helpers.mul([1, null, 2]), 0)
  t.is(helpers.mul([1, 2, 3]), 6)
  t.is(helpers.mul([-1, 2, 3]), -6)
})

test('Weighted arithmetic mean from array of weights and scores', (t) => {
  t.true(Number.isNaN(helpers.weightedMean()))
  t.true(Number.isNaN(helpers.weightedMean([])))
  t.is(helpers.weightedMean([[1, 50]]), 50)
  t.is(helpers.weightedMean([[1, 0], [4, 100]]), 80)
  t.is(helpers.weightedMean([[1, 0], [1, 50], [1, 100]]), 50)
})
