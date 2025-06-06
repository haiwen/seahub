'use strict';

process.env.NODE_ENV = 'development';
process.env.BABEL_ENV = 'development';

const Webpack = require('webpack')
const WebpackDevServer = require('webpack-dev-server')
const ignoredFiles = require('react-dev-utils/ignoredFiles');
const configFactory = require('./webpack.config');
const paths = require('./paths');
const getHttpsConfig = require('./getHttpsConfig');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || '3000';
const publicPath = process.env.PUBLIC_PATH || '/assets/bundles/';

const devServerOptions = {
  allowedHosts: 'all',
  hot: true,
  static: {
    directory: paths.appBuild,
    publicPath: publicPath,
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
  server: getHttpsConfig(),
  host: HOST,
  port: PORT,
};

console.log('Dev server options:', devServerOptions);

const config = configFactory('development');
const compiler = Webpack(config);
try {
  const server = new WebpackDevServer(devServerOptions, compiler);

  server.startCallback(() => {
    console.log(`Listening at http://${HOST}:${PORT}${publicPath}`);
  });

  async function stopServer() {
    try {
      await server.stop();
    } catch (error) {
      console.error('Close server error:', error);
      process.exit(1);
    }
  }

  ['SIGINT', 'SIGTERM'].forEach(function (sig) {
    process.on(sig, function () {
      stopServer().then(() => {
        process.exit(0);
      });
      process.exit();
    });
  });
} catch(err) {
  if (err && err.message) {
    console.log(err.message);
  }
  process.exit(1);
}
