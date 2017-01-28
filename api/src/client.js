const { renderClientRoute } = require('./pages/router')
const { initStore, actions } = require('./store.js')
const localStorage = window.localStorage
const store = initStore({
  rankings: JSON.parse(localStorage.getItem('httptest-rankings')) || undefined
})
renderClientRoute({
  store: store,
  element: document.getElementById('app')
})
window.onbeforeunload = () => {
  const state = store.getState()
  // TODO store analyses aswell
  localStorage.setItem('httptest-rankings', JSON.stringify(state.rankings))
}
// Global events
const source = new window.EventSource('/api/events')
const checkOrigin = event => {
  return event.origin.includes(window.location.host)
}
source.addEventListener('rankings-latest', event => {
  if (!checkOrigin(event)) return
  store.dispatch(actions.saveRankings({ latest: JSON.parse(event.data) }))
})
source.addEventListener('rankings-best', event => {
  if (!checkOrigin(event)) return
  store.dispatch(actions.saveRankings({ best: JSON.parse(event.data) }))
})
source.addEventListener('rankings-worst', event => {
  if (!checkOrigin(event)) return
  store.dispatch(actions.saveRankings({ worst: JSON.parse(event.data) }))
})
source.addEventListener('rankings-totals', event => {
  if (!checkOrigin(event)) return
  store.dispatch(actions.saveRankings({ totals: JSON.parse(event.data) }))
})
source.addEventListener('queue-push', event => {
  if (!checkOrigin(event)) return
  store.dispatch(actions.updateAnalysisStatus({
    status: 'queuing',
    url: event.data
  }))
})
source.addEventListener('queue-pop', event => {
  if (!checkOrigin(event)) return
  store.dispatch(actions.updateAnalysisStatus({
    status: 'analyzing',
    url: event.data
  }))
})
source.addEventListener('analysis-error', event => {
  if (!checkOrigin(event)) return
  store.dispatch(actions.updateAnalysisStatus(JSON.parse(event.data)))
})
source.addEventListener('analysis-done', event => {
  if (!checkOrigin(event)) return
  store.dispatch(actions.saveAnalysis(JSON.parse(event.data)))
})
