'use strict';
// https://github.com/webpack/webpack-dev-server/blob/master/examples/api/simple/server.js
const dotenv = require('dotenv');

dotenv.config();

process.env.NODE_ENV = 'development';
process.env.BABEL_ENV = 'development';

const Webpack = require('webpack')
const WebpackDevServer = require('webpack-dev-server')
const ignoredFiles = require('react-dev-utils/ignoredFiles');
const configFactory = require('./webpack.config')
const paths = require('./paths');
const getHttpsConfig = require('./getHttpsConfig');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || '3000';
const publicPath = process.env.PUBLIC_PATH || '/assets/bundles/';
const publicUrlOrPath = `http://${HOST}:${PORT}${publicPath}`;

const devServerOptions = {
  allowedHosts: 'all',
  hot: true,
  static: {
    directory: paths.appBuild,
    publicPath: publicUrlOrPath,
    watch: {
      ignored: ignoredFiles(paths.appSrc),
    },
  },
  client: {
    overlay: false,
  },
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': '*',
    'Access-Control-Allow-Headers': '*',
  },
  // Enable gzip compression of generated files.
  compress: true,
  https: getHttpsConfig(),
  host: HOST,
  port: PORT,
};

console.log('Dev server options:', devServerOptions);

const config = configFactory('development');
const compiler = Webpack(config);
const server = new WebpackDevServer(devServerOptions, compiler);

server.startCallback(() => {
  console.log(`Listening at http://${HOST}:${PORT}`);
});
