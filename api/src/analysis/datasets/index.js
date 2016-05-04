import fs from 'fs'

const datasets = {
  'http://seznam.cz': JSON.parse(fs.readFileSync('./datasets/http:seznam.cz.har', 'utf-8')),
  'http://svager.cz': JSON.parse(fs.readFileSync('./datasets/http:svager.cz.har', 'utf-8'))
}
export const domains = Object.keys(datasets)

export function mapDatasets (fn) {
  return domains.reduce((obj, key, idx) => {
    obj[key] = fn(datasets[key], idx)
    return obj
  }, {})
}

export default datasets
