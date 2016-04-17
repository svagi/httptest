import { match } from 'react-router'
import { renderToString, renderToStaticMarkup } from 'react-dom/server'
import Analyze from './pages/Analyze'
import Index from './pages/Index'
import IndexRoute from 'react-router/lib/IndexRoute'
import Layout from './pages/Layout'
import React from 'react'
import Redirect from 'react-router/lib/Redirect'
import Root from './pages/Root'
import Route from 'react-router/lib/Route'
import RouterContext from 'react-router/lib/RouterContext'

export const routes = (
<Route path='/' component={Root}>
  <IndexRoute component={Index} />
  <Route path='analyze' component={Analyze} />
  <Redirect from='*' to='/' />
</Route>
)

export function renderMarkup (props) {
  const opts = {
    routes: routes,
    location: props.originalUrl
  }
  return new Promise((resolve, reject) => {
    match(opts, (error, redirect, routerProps) => {
      if (error) {
        console.log(error)
        return reject({ error: error })
      }
      if (redirect) {
        return resolve({ redirect: redirect })
      }
      return resolve({
        routerProps: routerProps,
        markup: '<!DOCTYPE html>' + renderToStaticMarkup(
            <Layout {...props}>
              {renderToString(<RouterContext {...routerProps} />)}
            </Layout>
        )
      })
    })
  })
}
