import path from 'path'
import fs from 'fs'

function load (filename) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, filename), 'utf-8'))
}

export const datasets = {
  'http://seznam.cz': [
    load('1-seznam.cz.har')
  ],
  'http://svager.cz': [
    load('1-svager.cz.har')
  ]
}
export const domains = Object.keys(datasets)
