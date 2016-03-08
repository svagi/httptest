import Promise from 'bluebird'
import tls from 'tls'

export function uniqProtocols (arr) {
  return [...new Set(arr)].filter((prot) => prot)
}

function negotiateNPN (hostname, protocols) {
  const client = tls.connect({
    'host': hostname,
    'port': 443,
    'servername': hostname,
    'NPNProtocols': protocols,
    'rejectUnauthorized': false
  })
  return new Promise((resolve, reject) => {
    client.on('secureConnect', () => {
      resolve(client.npnProtocol)
      client.end()
    })
    client.on('error', reject)
  })
}

function negotiateALPN (hostname, protocols) {
  const client = tls.connect({
    'host': hostname,
    'port': 443,
    'servername': hostname,
    'ALPNProtocols': protocols,
    'rejectUnauthorized': false
  })
  return new Promise((resolve, reject) => {
    client.on('secureConnect', () => {
      resolve(client.alpnProtocol)
      client.end()
    })
    client.on('error', reject)
  })
}

export function getProtocols (hostname, testProtocols = ['h2', 'http/1.1']) {
  const promises = [
    ...testProtocols.map((protocol) => negotiateALPN(hostname, [protocol])),
    ...testProtocols.map((protocol) => negotiateNPN(hostname, [protocol]))
  ]
  return Promise.all(promises)
    .then((protocols) => ({
      success: true,
      protocols: uniqProtocols(protocols)
    }))
    .catch(() => ({
      success: false,
      protocols: []
    }))
}
