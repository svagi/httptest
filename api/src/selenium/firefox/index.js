/* global window, HAR */
import firefox from 'selenium-webdriver/firefox'
import path from 'path'
import Promise from 'bluebird'
import webdriver from 'selenium-webdriver'
import fs from 'fs'

function createOptions (prefs) {
  const profile = new firefox.Profile()
  profile.addExtension('/api/src/selenium/firefox/harexporttrigger-0.5.0-beta.8.xpi')
  Object.keys(prefs)
    .forEach((pref) => profile.setPreference(pref, prefs[pref]))
  return new firefox.Options().setProfile(profile)
}

export function generateHAR ({ url, hostname, dir, id, ext }) {
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
    'extensions.netmonitor.har.contentAPIToken': 'httptest',
    'extensions.netmonitor.har.enableAutomation': true,
    'extensions.netmonitor.har.autoConnect': true
  })
  const driver = new webdriver.Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)
    .build()
  return new Promise((resolve, reject) => {
    driver.manage().timeouts().setScriptTimeout(10000)
      .then(() => driver.manage().window().maximize())
      .then(() => driver.get(url))
      .then(() => new Promise((resolve, reject) => {
        function asyncScript () {
          var done = arguments[arguments.length - 1]
          var opts = {
            token: 'httptest',
            getData: true,
            title: arguments[0]
          }
          function triggerExport () {
            return HAR.triggerExport(opts)
              .then(function (result) {
                var har = JSON.parse(result.data)
                var perf = window.performance.timing.toJSON()
                var pageTimings = har.log.pages[0].pageTimings
                pageTimings.onContentLoad = perf.domContentLoadedEventStart - perf.navigationStart
                pageTimings.onLoad = perf.loadEventStart - perf.navigationStart
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
        driver.executeAsyncScript(asyncScript, hostname)
          .then(resolve)
          .catch(() => {
            console.log(`/data/${hostname}/${id}.har`)
            fs.readFile(`/data/${hostname}/${id}.har`, 'utf-8', (err, data) => {
              if (!err) {
                resolve(JSON.parse(data))
              } else {
                reject(err)
              }
            })
          })
      }))
      .then(resolve)
      .then(() => {
        driver.close()
        driver.quit()
      })
      .catch((err) => {
        driver.close()
        driver.quit()
        reject(err)
      })
  })
}
