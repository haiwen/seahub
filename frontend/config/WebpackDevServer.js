var webpack = require('webpack')
var WebpackDevServer = require('webpack-dev-server')
var config = require('./webpack.config.dev')
const paths = require('./paths');

new WebpackDevServer(webpack(config), {
  publicPath: config.output.publicPath,
  hot: true,
  watchOptions: {
    aggregateTimeout: 1000,
    poll: true,
    poll: 5000,
    ignored: paths.appNodeModules,
  },
  contentBase: '../assets',
  historyApiFallback: true,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
  }
}).listen(3000, '0.0.0.0', function (err, result) {
  if (err) {
    console.log(err)
  }

  console.log('Listening at 0.0.0.0:3000')
})
