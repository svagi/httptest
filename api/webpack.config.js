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
  new ExtractTextPlugin('app.bundle.css', { allChunks: true }),
  new webpack.optimize.CommonsChunkPlugin({ name: 'react' }),
  new webpack.optimize.CommonsChunkPlugin({
    name: 'init',
    names: [''],
    minChunks: Infinity
  })
]
var productionPlugins = [
  new webpack.optimize.DedupePlugin(),
  new webpack.optimize.AggressiveMergingPlugin(),
  new webpack.optimize.UglifyJsPlugin({
    comments: false,
    compress: {
      warnings: false
    },
    sourceMap: false
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
    app: '/api/src/client.js',
    react: ['react', 'react-dom', 'react-router']
  },
  output: {
    path: '/api/static',
    filename: '[name].bundle.js'
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
        include: ['/api/src']
      },
      {
        test: /\.css$/,
        loader: ExtractTextPlugin.extract('style', 'css', 'postcss'),
        include: ['/api/src']
      }
    ]
  }
}