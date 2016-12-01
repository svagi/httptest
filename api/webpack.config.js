var webpack = require('webpack')
var autoprefixer = require('autoprefixer')
var AssetsPlugin = require('assets-webpack-plugin')
var CompressionPlugin = require('compression-webpack-plugin')
var ExtractTextPlugin = require('extract-text-webpack-plugin')
var env = process.env.NODE_ENV
var isProduction = env === 'production'

var commonPlugins = [
  new webpack.DefinePlugin({
    'process.env': {
      BROWSER: JSON.stringify(true),
      NODE_ENV: JSON.stringify(env)
    }
  }),
  new ExtractTextPlugin('app.bundle.css?v=[contenthash]', { allChunks: true }),
  new webpack.optimize.CommonsChunkPlugin({ name: 'react' }),
  new webpack.optimize.CommonsChunkPlugin({
    name: 'init',
    names: [''],
    minChunks: Infinity
  }),
  new AssetsPlugin({ path: '/api/build', filename: 'assets.json' })
]
var developmentPlugins = [
  new CompressionPlugin({ asset: '[path].gz', threshold: 256 })
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
  new CompressionPlugin({ asset: '[path].gz', threshold: 256 })
]

module.exports = {
  devtool: isProduction ? 'hidden' : 'cheap-source-map',
  entry: {
    app: '/api/src/client.js',
    react: ['react', 'react-dom', 'react-router']
  },
  output: {
    path: '/api/static',
    filename: '[name].bundle.js?v=[chunkhash]'
  },
  watchOptions: {
    poll: true // needed for watching in docker
  },
  plugins: isProduction
    ? commonPlugins.concat(productionPlugins)
    : commonPlugins.concat(developmentPlugins),
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
