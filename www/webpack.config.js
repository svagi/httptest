var webpack = require('webpack')
var autoprefixer = require('autoprefixer')
var CompressionPlugin = require('compression-webpack-plugin')
var ExtractTextPlugin = require('extract-text-webpack-plugin')
var env = process.env.NODE_ENV
var isProduction = env === 'production'
console.log('Building for ' + env + '...')

var commonPlugins = [
  new webpack.DefinePlugin({
    'process.env': {
      BROWSER: JSON.stringify(true),
      NODE_ENV: JSON.stringify(env)
    }
  }),
  new ExtractTextPlugin('bundle.css', { allChunks: true })
]
var productionPlugins = [
  new webpack.optimize.OccurenceOrderPlugin(),
  new webpack.optimize.DedupePlugin(),
  new webpack.optimize.UglifyJsPlugin({
    comments: false,
    compress: {
      warnings: false
    }
  }),
  new CompressionPlugin({
    asset: '[path].gz[query]',
    algorithm: 'gzip',
    test: /\.js$|\.html|\.css$/,
    threshold: 256
  })
]

module.exports = {
  devtool: isProduction ? 'cheap-module-source-map' : 'eval',
  entry: {
    bundle: '/www/src/client.js'
  },
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
        loader: ExtractTextPlugin.extract('style', 'css', 'postcss')
      }
    ]
  }
}
