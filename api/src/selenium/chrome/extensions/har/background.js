/* global chrome */

var connections = {}

// Listen to DevTools page connections
chrome.runtime.onConnect.addListener(function (port) {
  if (port.name === 'devtools') {
    // Listen to messages sent from the DevTools page
    var listener = function (message, sender, sendResponse) {
      if (message.name === 'init') {
        connections[message.tabId] = port
      }
    }
    port.onMessage.addListener(listener)
    // Listen to DevTools disconnect, then remove connection
    port.onDisconnect.addListener(function (port) {
      port.onMessage.removeListener(listener)
      var tabs = Object.keys(connections)
      for (var i = 0, len = tabs.length; i < len; i++) {
        if (connections[tabs[i]] === port) {
          delete connections[tabs[i]]
          break
        }
      }
    })
  }
})

// Listen to load complete event, then send a message to the DevTools page
chrome.tabs.onUpdated.addListener(function (tabId, change, tab) {
  if (change.status === 'complete' && tab.active) {
    var port = connections[tabId]
    if (port) port.postMessage('load')
  }
})
