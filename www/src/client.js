import { render } from 'react-dom'
import { routes } from './router'
import history from './history'
import match from 'react-router/lib/match'
import React from 'react'
import Router from 'react-router/lib/Router'

const options = {
  history: history,
  routes: routes
}
match(options, (error, redirect, renderProps) => {
  if (error) return
  render(<Router {...renderProps} />, document.getElementById('root'))
})
