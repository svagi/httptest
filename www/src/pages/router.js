import { match } from 'react-router'
import { renderToString, renderToStaticMarkup } from 'react-dom/server'
import history from 'react-router/lib/browserHistory'
import IndexRoute from 'react-router/lib/IndexRoute'
import React from 'react'
import Redirect from 'react-router/lib/Redirect'
import Route from 'react-router/lib/Route'
import RouterContext from 'react-router/lib/RouterContext'

// Pages
import Analyze from './Analyze'
import Index from './Index'
import Layout from './Layout'
import Root from './Root'

// Export browser history
export { history }

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
