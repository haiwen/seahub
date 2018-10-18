'use strict';
// https://github.com/webpack/webpack-dev-server/blob/master/examples/api/simple/server.js

var Webpack = require('webpack')
var WebpackDevServer = require('webpack-dev-server')
var config = require('./webpack.config.dev')

const compiler = Webpack(config);
const devServerOptions = Object.assign({}, config.devServer, {
  stats: {
    colors: true
  }
});

console.log('Dev server options:', devServerOptions);

const server = new WebpackDevServer(compiler, devServerOptions);
server.listen(3000, '0.0.0.0', function (err, result) {
  if (err) {
    console.log(err)
  }

  console.log('Listening at 0.0.0.0:3000')
})
