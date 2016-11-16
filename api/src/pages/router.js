import React from 'react'
import { render } from 'react-dom'
import { renderToString, renderToStaticMarkup } from 'react-dom/server'
import history from 'react-router/lib/browserHistory'
import IndexRoute from 'react-router/lib/IndexRoute'
import match from 'react-router/lib/match'
import Route from 'react-router/lib/Route'
import Router from 'react-router/lib/Router'
import RouterContext from 'react-router/lib/RouterContext'

// Pages - order of imports matter because of css imports!
import Html from './Html'
import Root from './Root'
import Index from './Index'
import Analyze from './Analyze'

// Export browser history
export { history }

export const routes = (
<Route path='/' component={Root}>
  <IndexRoute component={Index} />a
  <Route path='analyze' component={Analyze} />
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
