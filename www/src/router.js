import React from 'react'
import { Route, IndexRoute, Redirect, RouterContext } from 'react-router'
import { match } from 'react-router'
import createHistory from 'react-router/lib/createMemoryHistory'
import { renderToString, renderToStaticMarkup } from 'react-dom/server'
import Root from './pages/Root'
import Index from './pages/Index'
import Layout from './pages/Layout'

export const routes = (
<Route path='/' component={Root}>
  <IndexRoute component={Index} />
  <Redirect from='*' to='/' />
</Route>
)

export function renderMarkup (props) {
  const opts = {
    history: createHistory(props.originalUrl),
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
