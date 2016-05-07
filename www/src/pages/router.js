import React from 'react'
import { render } from 'react-dom'
import { renderToString, renderToStaticMarkup } from 'react-dom/server'
import history from 'react-router/lib/browserHistory'
import IndexRoute from 'react-router/lib/IndexRoute'
import match from 'react-router/lib/match'
import Redirect from 'react-router/lib/Redirect'
import Route from 'react-router/lib/Route'
import Router from 'react-router/lib/Router'
import RouterContext from 'react-router/lib/RouterContext'

// Pages
import Analyze from './Analyze'
import Index from './Index'
import Html from './Html'
import Root from './Root'

// Export browser history
export { history }

export const routes = (
<Route path='/' component={Root}>
  <IndexRoute component={Index} />a
  <Route path='analyze' component={Analyze} />
  <Redirect from='*' to='/' />
</Route>
)

export function renderClientRoute (props) {
  return match({ routes, history, ...props }, (err, redirect, routerProps) => {
    if (err) {
      console.err(err)
      return
    }
    return render(<Router {...routerProps} />, props.element)
  })
}

export function renderServerRoute (props) {
  return new Promise((resolve, reject) => {
    match({ routes, history, ...props }, (err, redirect, routerProps) => {
      if (err) {
        console.err(err)
        return reject(err)
      }
      if (redirect) {
        return resolve({ redirect: redirect })
      }
      return resolve({
        routerProps: routerProps,
        html: '<!DOCTYPE html>' + renderToStaticMarkup(
            <Html title='httptest.net' {...props}>
            {renderToString(<RouterContext {...routerProps} />)}
            </Html>
        )
      })
    })
  })
}
