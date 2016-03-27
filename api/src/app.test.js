import test from 'ava'
import request from 'supertest'
import { app } from './app'

test('GET /protocols without url should return 400', (t) => {
  return request(app)
    .get('/protocols')
    .expect(400, {
      errors: [ { param: 'url', msg: 'Invalid value' } ]
    })
})

test('GET /protocols?url=localhost should return 200 & success=false', (t) => {
  return request(app)
    .get('/protocols?url=localhost')
    .expect(200, {
      protocols: [],
      success: false
    })
})
