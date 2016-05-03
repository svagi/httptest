import test from 'ava'
import fs from 'fs'
import analyze, { convertHeaders } from './analyze'

const har = JSON.parse(fs.readFileSync('./datasets/seznam.cz.har', 'utf-8'))
const analysis = {
  'seznam.cz': analyze(har)
}

test('analysis is object', (t) => {
  t.is(typeof analysis['seznam.cz'], 'object')
})

test('convert array headers to object headers', (t) => {
  const arrayHeaders = har.log.entries[0].request.headers
  const objectHeaders = convertHeaders(arrayHeaders)
  t.is(typeof objectHeaders, 'object')
  t.is(arrayHeaders.length, Object.keys(objectHeaders).length)
})

test('stats as property of analysis is object', (t) => {
  const { stats } = analysis['seznam.cz']
  t.is(typeof stats, 'object')
})

test('stats.totalRequests is number greater or equeal to zero', (t) => {
  const { stats } = analysis['seznam.cz']
  t.true(stats.totalRequests >= 0)
})

test('stats.totalRedirects is number greater or equeal to zero', (t) => {
  const { stats } = analysis['seznam.cz']
  t.true(stats.totalRedirects >= 0)
})

test('stats.http2Requests is number greater or equeal to zero', (t) => {
  const { stats } = analysis['seznam.cz']
  t.true(stats.http2Requests >= 0)
})

test('stats.totalBytes is number greater or equeal to zero', (t) => {
  const { stats } = analysis['seznam.cz']
  t.true(stats.totalBytes >= 0)
})

test('stats.domLoadTime is number greater or equeal to zero', (t) => {
  const { stats } = analysis['seznam.cz']
  t.true(stats.domLoadTime >= 0)
})

test('stats.loadTime is number greater or equeal to zero', (t) => {
  const { stats } = analysis['seznam.cz']
  t.true(stats.loadTime >= 0)
})

test('stats.domains is array', (t) => {
  const { stats } = analysis['seznam.cz']
  t.true(Array.isArray(stats.domains))
})
