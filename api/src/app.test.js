import test from 'ava'
import request from 'supertest'
import { app } from './app'

test('GET / should return status 200', ($) => {
  request(app)
    .get('/')
    .expect(200)
})
