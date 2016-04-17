import { Router, match, browserHistory } from 'react-router'
import { render } from 'react-dom'
import { routes } from './router'
import React from 'react'

const options = {
  history: browserHistory,
  routes: routes
}
match(options, (error, redirectLocation, renderProps) => {
  console.log('RENDER')
  if (error) return
  render(<Router {...renderProps} />, document.getElementById('root'))
})
