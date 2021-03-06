import thunk from 'redux-thunk'
import { createStore, combineReducers, applyMiddleware } from 'redux'
import log from './debug'
import fetch from 'isomorphic-fetch'

function logger (store) {
  return next => action => {
    log.debug(action.type, action.data)
    const result = next(action)
    return result
  }
}

function requestStatePromise (store) {
  return next => action => {
    if (!action.promise) {
      return next(action)
    }
    function makeAction (data) {
      const newAction = Object.assign({}, action, data)
      delete newAction.promise
      return newAction
    }
    next(makeAction({
      type: action.type + '-request'
    }))
    return action.promise.then(
      payload => next(makeAction({
        type: action.type + '-success',
        payload: payload
      })),
      error => next(makeAction({
        type: action.type + '-failure',
        payload: error
      }))
    )
  }
}

export const initialState = {
  analyses: {},
  rankings: {
    latest: {},
    best: {},
    worst: {},
    totals: {}
  }
}

export const reducer = combineReducers({
  analyses (state = initialState.analyses, { type, data, payload }) {
    switch (type) {
      case 'get-analysis-success':
        return {
          ...state,
          [data.url]: payload
        }
      case 'get-analysis-failure':
        return {
          ...state,
          [data.url]: payload
        }
      case 'create-analysis-failure':
        return {
          ...state,
          [data.url]: payload
        }
      case 'save-analysis':
        return {
          ...state,
          [data.url]: { ...data.analysis, status: 'complete' }
        }
      case 'update-analysis-status':
        return {
          ...state,
          [data.url]: { ...state[data.url], status: data.status, message: data.message }
        }
      default:
        return state
    }
  },
  rankings (state = initialState.rankings, { type, data, payload }) {
    switch (type) {
      case 'save-rankings':
        return {
          latest: data.latest || state.latest,
          best: data.best || state.best,
          worst: data.worst || state.worst,
          totals: data.totals || state.totals
        }
      default:
        return state
    }
  }
})

export const actions = {
  getAnalysis (parsedUrl) {
    return dispatch => dispatch({
      type: 'get-analysis',
      data: {
        url: parsedUrl.formatted
      },
      promise: fetch(`/api/analyses?url=${parsedUrl.encoded}`)
        .then(response => {
          return response.json().then(payload => {
            if (response.ok) {
              return { ...payload, status: 'complete' }
            } else {
              if (response.status === 404) {
                // Create a new analysis
                // and overwrite "Not Found" message in payload response
                dispatch(actions.createAnalysis(parsedUrl))
                return Promise.reject({ ...payload, status: 'connecting', message: null })
              } else {
                return Promise.reject({ ...payload, status: 'error' })
              }
            }
          })
        })
    })
  },
  createAnalysis (parsedUrl) {
    return {
      type: 'create-analysis',
      data: {
        url: parsedUrl.formatted
      },
      promise: fetch(`/api/analyses?url=${parsedUrl.encoded}`, { method: 'POST' })
        .then(response => {
          return response.json().then(payload => {
            if (response.ok) {
              return { ...payload, status: 'complete' }
            } else {
              return Promise.reject({ ...payload, status: 'error' })
            }
          })
        })
    }
  },
  saveAnalysis (analysis) {
    return {
      type: 'save-analysis',
      data: {
        url: analysis.url,
        analysis: analysis
      }
    }
  },
  updateAnalysisStatus (data) {
    return {
      type: `update-analysis-status`,
      data: data
    }
  },
  saveRankings (data) {
    return {
      type: 'save-rankings',
      data: data
    }
  }
}

export function initStore (state = initialState) {
  return createStore(reducer, state, applyMiddleware(
    thunk,
    requestStatePromise,
    logger
  ))
}
