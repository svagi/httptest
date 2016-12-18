export default {
  reduceServerResponseTime: {
    title: 'Improve server response time',
    description: 'Long web server response times delay page loading speeds.'
  },
  reuseTCPconnections: {
    title: 'Reuse TCP connections',
    description: 'Persistent connections allow multiple HTTP requests use the same TCP connection, thus eliminates TCP handshakes and slow-start latency overhead. Leverage persistent connections whenever possible.'
  },
  cacheAssets: {
    title: 'Cache resources on the client',
    description: 'Reduce the load time of your page by storing commonly used files on your visitors browser.'
  },
  useCacheValidators: {
    title: 'Specify cache validation mechanisms',
    description: 'Specify the Last-Modified or Etag header to allow the client to check if the expired resource has been updated, if not data transfer can be omitted.'
  },
  compressAssets: {
    title: 'Compress resources during transfer',
    description: 'Application resources should be transferred with the minimum number of bytes. Always apply the best compression method for each transferred asset.'
  },
  reduceRedirects: {
    title: 'Minimize number of HTTP redirects',
    description: 'HTTP redirects impose high latency overhead. The optimal number of redirects is zero.'
  },
  reduceDNSlookups: {
    description: 'Making requests to a large number of different hosts can hurt performance.',
    title: 'Reduce DNS lookups'
  },
  minifyAssets: {
    description: 'Minification reduces the overall size of resources, thus increasing the loading speed.',
    title: 'Minify recources'
  },
  eliminateBrokenRequests: {
    description: 'Avoid fetching content that does not exist.',
    title: 'Eliminate requests to non-existent or broken resources'
  },
  useHttp2: {
    title: 'Serve resources using HTTP/2',
    description: 'HTTP/2 enables more efficient use of network resources and reduced latency by enabling request and response multiplexing, header compression, prioritization, and more.'
  },
  eliminateDomainSharding: {
    title: 'Elimiminate domain sharding',
    description: 'Under HTTP/1 parallelism is limited by number of TCP connections (in practice ~6 connections per origin). However, each of these connections incur unnecessary overhead and compete with each other for bandwidth. Domain sharding should be avoided in HTTP/2.'
  },
  avoidConcatenating: {
    title: 'Avoid resource concatenating',
    description: 'Ship small granular resources and optimize caching policies. Significant wins in compression are the only cases where it might be useful to benefit from resource concatenating.'
  },
  useServerPush: {
    title: 'Eliminate roundtrips with Server Push',
    description: 'Server push enables the server to send multiple responses (in parallel) for a single client request, thus eliminates entire roundtrips of unnecessary network latency.'
  }
}
