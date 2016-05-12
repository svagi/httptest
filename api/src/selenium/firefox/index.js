/* global window, HAR */
import firefox from 'selenium-webdriver/firefox'
import path from 'path'
import Promise from 'bluebird'
import webdriver from 'selenium-webdriver'

function createOptions (prefs) {
  const profile = new firefox.Profile()
  profile.addExtension('/api/src/selenium/firefox/harexporttrigger-0.5.0-beta.8.xpi')
  Object.keys(prefs)
    .forEach((pref) => profile.setPreference(pref, prefs[pref]))
  return new firefox.Options().setProfile(profile)
}

function exportHARtrigger (options, done) {
  function triggerExport () {
    return HAR.triggerExport(options).then(function (result) {
      var har = JSON.parse(result.data)
      var perf = window.performance.timing.toJSON()
      var navStart = perf.navigationStart
      har.log.pages[0].pageTimings = {
        onContentLoad: perf.domContentLoadedEventStart - navStart,
        onLoad: perf.loadEventStart - navStart,
        onConnect: perf.responseEnd - perf.requestStart
      }
      done(har)
    })
      .catch(done)
  }
  if (typeof HAR === 'undefined') {
    window.addEventListener('har-api-ready', triggerExport, false)
  } else {
    triggerExport()
  }
}

export function generateHAR ({ url, hostname, dir, id, ext }) {
  return new Promise((resolve, reject) => {
    const token = 'httptest'
    const options = createOptions({
      'app.update.enabled': false,
      'devtools.toolbar.enabled': true,
      'devtools.cache.disabled': true,
      'browser.sessionhistory.max_entries': 0,
      'browser.sessionhistory.max_total_viewers': 0,
      'browser.cache.memory.capacity': 0,
      'browser.cache.disk.capacity': 0,
      'browser.cache.disk.enable': false,
      'browser.cache.memory.enable': false,
      'browser.cache.check_doc_frequency': 1,
      'network.dnsCacheExpiration': 0,
      'devtools.netmonitor.enabled': true,
      'devtools.netmonitor.har.enableAutoExportToFile': true,
      'devtools.netmonitor.har.includeResponseBodies': false,
      'devtools.netmonitor.har.pageLoadedTimeout': 1500,
      'devtools.netmonitor.har.defaultFileName': id,
      'devtools.netmonitor.har.defaultLogDir': path.join(dir, hostname),
      'extensions.netmonitor.har.contentAPIToken': token,
      'extensions.netmonitor.har.enableAutomation': true,
      'extensions.netmonitor.har.autoConnect': true
    })
    const driver = new webdriver.Builder()
      .forBrowser('firefox')
      .setFirefoxOptions(options)
      .build()
    driver.manage().timeouts().setScriptTimeout(10000)
      .then(() => driver.manage().window().maximize())
      .then(() => driver.get(url))
      .then(() => driver.executeAsyncScript(exportHARtrigger, { token: token, getData: true }))
      // On success resolve HAR object
      .then(resolve)
      // On failure reject with error
      .catch(reject)
      // Finnaly close browser window and quit session
      .thenFinally(() => {
        driver.close()
        driver.quit()
      })
  })
}
