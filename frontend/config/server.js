'use strict';
// https://github.com/webpack/webpack-dev-server/blob/master/examples/api/simple/server.js

process.env.NODE_ENV = 'development';
process.env.BABEL_ENV = 'development';

var Webpack = require('webpack')
var WebpackDevServer = require('webpack-dev-server')
var configFactory = require('./webpack.config')
var config = configFactory('development');

const compiler = Webpack(config);
const devServerOptions = Object.assign({}, config.devServer, {
  stats: {
    colors: true
  },
  hot: true,
  // Use 'ws' instead of 'sockjs-node' on server since we're using native
  // websockets in `webpackHotDevClient`.
  transportMode: 'ws',
  // Prevent a WS client from getting injected as we're already including
  // `webpackHotDevClient`.
  injectClient: false,
});

console.log('Dev server options:', devServerOptions);

const server = new WebpackDevServer(compiler, devServerOptions);
server.listen(3000, '0.0.0.0', function (err, result) {
  if (err) {
    console.log(err)
  }

  console.log('Listening at 0.0.0.0:3000')
})
