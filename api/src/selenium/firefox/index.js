import { watch } from 'chokidar'
import firefox from 'selenium-webdriver/firefox'
import fs from 'fs'
import path from 'path'
import Promise from 'bluebird'
import webdriver from 'selenium-webdriver'

const { readFileAsync } = Promise.promisifyAll(fs)

function createOptions (prefs) {
  const profile = new firefox.Profile()
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
    'devtools.netmonitor.har.defaultLogDir': path.join(dir, hostname)
  })
  const filepath = path.join(dir, hostname, id + ext)
  const watcher = watch(filepath, { usePolling: true })
  const driver = new webdriver.Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)
    .build()
  let timeoutId
  return new Promise((resolve, reject) => {
    driver.actions()
      // Open devtools with ctrl+shift+q (needed for HAR export)
      .keyDown(webdriver.Key.CONTROL)
      .keyDown(webdriver.Key.SHIFT)
      .sendKeys('q')
      .keyUp(webdriver.Key.SHIFT)
      .keyUp(webdriver.Key.CONTROL)
      .perform()
      .then(() => new Promise((resolve, reject) => {
        // Wait for exported HAR file
        watcher.on('add', resolve).on('error', reject)
        // Open url
        driver.get(url).then(() => {
          timeoutId = setTimeout(() => {
            reject(new Error('Watch timeout'))
            watcher.close()
            driver.close()
            driver.quit()
          }, 10000) // 10s
        })
      }))
      // Read HAR from disk
      .then((path) => readFileAsync(path, 'utf-8'))
      .then(JSON.parse)
      // Resolve HAR
      .then(resolve)
      .then(() => {
        clearTimeout(timeoutId)
        watcher.close()
        driver.close()
        driver.quit()
      })
      .catch(reject)
  })
}
