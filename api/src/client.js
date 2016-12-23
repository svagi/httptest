const { renderClientRoute } = require('./pages/router')
const { initStore, actions } = require('./store.js')

const store = initStore()
renderClientRoute({
  store: store,
  element: document.getElementById('app')
})

// Global events
const source = new window.EventSource('/api/events')
const checkOrigin = event => {
  return event.origin.includes(window.location.host)
}
source.addEventListener('error', (e) => {
  console.error('error', e)
  source.close()
})
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
source.addEventListener('queue-pop', event => {
  if (!checkOrigin(event)) return
  store.dispatch(actions.updateAnalysisStatus('analyzing', event.data))
})
source.addEventListener('analysis-done', event => {
  if (!checkOrigin(event)) return
  store.dispatch(actions.saveAnalysis(JSON.parse(event.data)))
})
source.addEventListener('analysis-error', event => {
  if (!checkOrigin(event)) return
  store.dispatch(actions.updateAnalysisStatus('error', event.data))
})
