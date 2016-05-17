function init () {
  require('./pages/router').renderClientRoute({
    element: document.getElementById('app')
  })
}

window.addEventListener('load', function load () {
  window.removeEventListener('load', load)
  init()
})
