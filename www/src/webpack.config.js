var webpack = require('webpack')
var autoprefixer = require('autoprefixer')
var env = process.env.NODE_ENV
var isProduction = env === 'production'
console.log('Building for ' + env + '...')

var commonPlugins = [
  new webpack.DefinePlugin({
    'process.env': {
      BROWSER: JSON.stringify(true),
      NODE_ENV: JSON.stringify(env)
    }
  })
]
var productionPlugins = [
  new webpack.optimize.OccurenceOrderPlugin(),
  new webpack.optimize.DedupePlugin(),
  new webpack.optimize.UglifyJsPlugin({
    compress: { warnings: false }
  })
]

module.exports = {
  devtool: isProduction ? 'cheap-module-source-map' : 'eval',
  entry: [
    '/www/src/client.js'
  ],
  output: {
    path: '/www/static',
    filename: 'bundle.js'
  },
  watchOptions: {
    poll: true // needed for watching in docker
  },
  plugins: isProduction
    ? commonPlugins.concat(productionPlugins)
    : commonPlugins,
  resolve: {
    extensions: ['', '.js']
  },
  postcss: [ autoprefixer({ browsers: ['last 2 versions'] }) ],
  module: {
    loaders: [
      {
        test: /\.js$/,
        loaders: ['babel'],
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        loaders: ['style', 'css', 'postcss']
      }
    ]
  }
}
