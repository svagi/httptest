import { watch } from 'chokidar'
import firefox from 'selenium-webdriver/firefox'
import fs from 'fs'
import path from 'path'
import Promise from 'bluebird'
import uuid from 'node-uuid'
import webdriver from 'selenium-webdriver'

const { readFileAsync, unlinkFileAsync } = Promise.promisifyAll(fs)

function createOptions (prefs) {
  const profile = new firefox.Profile()
  Object.keys(prefs)
    .forEach((pref) => profile.setPreference(pref, prefs[pref]))
  return new firefox.Options().setProfile(profile)
}

export function generateHAR (url, opts = {}) {
  const { id = uuid.v4(), dir = '/tmp', ext = '.har' } = opts
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
    'devtools.netmonitor.har.pageLoadedTimeout': 100,
    'devtools.netmonitor.har.defaultFileName': id,
    'devtools.netmonitor.har.defaultLogDir': dir
  })
  const filename = path.join(dir, id + ext)
  const watcher = watch(filename)
  const driver = new webdriver.Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)
    .build()
  return new Promise((resolve, reject) => {
    driver.actions()
      // Open devtools with ctrl+shift+q (needed for HAR export)
      .keyDown(webdriver.Key.CONTROL)
      .keyDown(webdriver.Key.SHIFT)
      .sendKeys('q')
      .keyUp(webdriver.Key.SHIFT)
      .keyUp(webdriver.Key.CONTROL)
      .perform()
      // Open url
      .then(() => driver.get(url))
      // Wait for exported HAR file
      .then(() => new Promise((resolve, reject) => {
        watcher.on('add', resolve).on('error', reject)
      }))
      // Read HAR from disk
      .then(readFileAsync)
      // Resolve HAR
      .then(resolve)
      .then(() => {
        watcher.close()
        driver.quit()
        unlinkFileAsync(filename)
      })
      .catch(reject)
  })
}
