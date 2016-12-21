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
    isEmpty: true,
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
          [data.url]: {
            ...payload,
            status: payload.type === 'create-analysis-success' ? 'queuing' : 'complete'
          }
        }
      case 'get-analysis-failure':
        return {
          ...state,
          [data.url]: {
            ...payload,
            status: 'error'
          }
        }
      case 'create-analysis-success':
        return {
          ...state,
          [data.url]: { ...state[data.url], status: 'queuing' }
        }
      case 'create-analysis-failure':
        return {
          ...state,
          [data.url]: { ...payload, status: 'error' }
        }
      case 'save-analysis':
        return {
          ...state,
          [data.url]: { ...data.analysis, status: 'complete' }
        }
      case 'update-analysis-status':
        return {
          ...state,
          [data.url]: { ...state[data.url], status: data.status }
        }
      default:
        return state
    }
  },
  rankings (state = initialState.rankings, { type, data, payload }) {
    switch (type) {
      case 'save-rankings':
        return {
          isEmpty: false,
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
      promise: fetch(`/analyses?url=${parsedUrl.encoded}`)
        .then(response => {
          return response.json().then(payload => {
            if (response.ok) {
              return payload
            }
            if (response.status === 404) {
              return dispatch(actions.createAnalysis(parsedUrl))
            }
            return Promise.reject({ ...response, ...payload })
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
      promise: fetch(`/analyses?url=${parsedUrl.encoded}`, { method: 'POST' })
        .then(response => {
          return response.json().then(payload => {
            if (response.ok) {
              return payload
            } else {
              return Promise.reject({ ...response, ...payload })
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
  updateAnalysisStatus (status, url) {
    return {
      type: `update-analysis-status`,
      data: {
        url: url,
        status: status
      }
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
