/* eslint-env node */
const WebpackDevMiddleware = require('webpack-dev-middleware');
const webpack = require('webpack');
const config = require('./webpack.testem.config.js');
const compiler = webpack(config);

module.exports = {
  framework: 'jasmine',
  test_page: 'testem/runner.html',
  launch_in_dev: ['Chrome'],
  launch_in_ci: ['ChromiumHeadless'],
  launchers: {
    ChromiumHeadless: {
      command: 'c:\\automation\\chrome\\win64-138.0.7204.49\\chrome-win64\\chrome.exe --headless --disable-gpu --remote-debugging-port=9222 --no-sandbox',
      protocol: 'browser'
    },
    Chrome: {
      command: 'c:\\automation\\chrome\\win64-138.0.7204.49\\chrome-win64\\chrome.exe --remote-debugging-port=9222',
      protocol: 'browser'
    }
  },
  routes: {
    '/jasmine': 'node_modules/jasmine-core/lib/jasmine-core'
  },
  middleware: [
    new WebpackDevMiddleware(compiler, {
      stats: 'errors-only',
      publicPath: '/testem/compiled/'
    })
  ]
};