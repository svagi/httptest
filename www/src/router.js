import React from 'react'
import { Router, Route, match, RouterContext } from 'react-router'
import { renderToString, renderToStaticMarkup } from 'react-dom/server'
import App from './pages/App'
import Layout from './pages/Layout'

export const routes = (
<Router>
  <Route path='/' component={App} />
</Router>
)

export function renderMarkup ({ location='/', ...props }) {
  return new Promise((resolve, reject) => {
    match({ routes, location }, (error, redirect, routerProps) => {
      if (error) {
        return reject(error)
      }
      return resolve({
        redirect: redirect,
        routerProps: routerProps,
        markup: renderToStaticMarkup(
          <Layout {...props}>
            {renderToString(<RouterContext {...routerProps} />)}
          </Layout>
        )
      })
    })
  })
}
