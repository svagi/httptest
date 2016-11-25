import test from 'ava'
import { datasets, domains } from './datasets'
import * as rules from './rules'
import { parseHAR } from './analyze'

domains.forEach(domain => datasets[domain].forEach((har, idx) => {
  const data = parseHAR(har)

  test(`[${idx}|${domain}] reuseTCPconnections`, (t) => {
    const result = rules.reuseTCPconnections(data)
    t.is(typeof result, 'object')
    t.true(Array.isArray(result.values))
    result.values.forEach(val => t.is(typeof val, 'string'))
    // console.log(result)
  })

  test(`[${idx}|${domain}] cacheAssets`, (t) => {
    const result = rules.cacheAssets(data)
    t.is(typeof result, 'object')
    t.true(Array.isArray(result.values))
    result.values.forEach(val => t.is(typeof val, 'string'))
    // console.log(result)
  })

  test(`[${idx}|${domain}] useCacheValidators`, (t) => {
    const result = rules.useCacheValidators(data)
    t.is(typeof result, 'object')
    t.true(Array.isArray(result.values))
    result.values.forEach(val => t.is(typeof val, 'string'))
    // console.log(result)
  })

  test(`[${idx}|${domain}] compressAssets`, (t) => {
    const result = rules.compressAssets(data)
    t.is(typeof result, 'object')
    t.true(Array.isArray(result.values))
    result.values.forEach(val => t.is(typeof val, 'string'))
    // console.log(result)
  })

  test(`[${idx}|${domain}] reduceRedirects`, (t) => {
    const result = rules.reduceRedirects(data)
    t.is(typeof result, 'object')
    t.true(Array.isArray(result.values))
    result.values.forEach(val => t.is(typeof val, 'string'))
    // console.log(result)
  })

  test(`[${idx}|${domain}] reduceDNSlookups`, (t) => {
    const result = rules.reduceDNSlookups(data)
    t.is(typeof result, 'object')
    t.true(Array.isArray(result.values))
    result.values.forEach(val => t.is(typeof val, 'string'))
    // console.log(result)
  })

  test(`[${idx}|${domain}] eliminateBrokenRequests`, (t) => {
    const result = rules.eliminateBrokenRequests(data)
    t.is(typeof result, 'object')
    t.true(Array.isArray(result.values))
    result.values.forEach(val => t.is(typeof val, 'string'))
    // console.log(result)
  })

  test(`[${idx}|${domain}] useHttp2`, (t) => {
    const result = rules.useHttp2(data)
    t.is(typeof result, 'object')
    t.true(Array.isArray(result.values))
    result.values.forEach(val => t.is(typeof val, 'string'))
    // console.log(result)
  })

  test(`[${idx}|${domain}] eliminateDomainSharding`, (t) => {
    const result = rules.eliminateDomainSharding(data)
    t.is(typeof result, 'object')
    t.true(Array.isArray(result.values))
    result.values.forEach(val => t.is(typeof val, 'string'))
    // console.log(result)
  })

  test(`[${idx}|${domain}] avoidConcatenating`, (t) => {
    const result = rules.avoidConcatenating(data)
    t.is(typeof result, 'object')
    t.true(Array.isArray(result.values))
    result.values.forEach(val => t.is(typeof val, 'string'))
    // console.log(result)
  })

  test(`[${idx}|${domain}] useServerPush`, (t) => {
    const result = rules.useServerPush(data)
    t.is(typeof result, 'object')
    t.true(Array.isArray(result.values))
    result.values.forEach(val => t.is(typeof val, 'string'))
    // console.log(result)
  })
}))
