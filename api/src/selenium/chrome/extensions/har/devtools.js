/* global chrome */

// Access to inspected window object
var inspectedWindow = chrome.devtools.inspectedWindow

// Helper function for console.log inside of inspected window
function log (obj) {
  return inspectedWindow.eval('console.log(' + JSON.stringify(obj) + ')')
}

// Create a connection to the background page
var connection = chrome.runtime.connect({ name: 'devtools' })

// Send initalization message with tabId
connection.postMessage({
  name: 'init',
  tabId: inspectedWindow.tabId
})

// Handle responses from the background page
connection.onMessage.addListener(function (message) {
  if (message === 'load') {
    chrome.devtools.network.getHAR(log)
  }
})
