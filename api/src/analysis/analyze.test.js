import test from 'ava'
import fs from 'fs'
import analyze, { convertHeaders } from './analyze'

const har = JSON.parse(fs.readFileSync('./datasets/seznam.cz.har', 'utf-8'))
const analysis = {
  'seznam.cz': analyze(har)
}

test('Analysis return object', (t) => {
  t.is(typeof analysis['seznam.cz'], 'object')
})

test('Convert array headers to object headers', (t) => {
  const arrayHeaders = har.log.entries[0].request.headers
  const objectHeaders = convertHeaders(arrayHeaders)
  t.is(typeof objectHeaders, 'object')
  t.is(arrayHeaders.length, Object.keys(objectHeaders).length)
})
