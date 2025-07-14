/*global require, module, __dirname, process */
const path = require('path');
const recursiveLs = require('fs-readdir-recursive');
const entries = {};
const testFilter = process.env.npm_package_config_test_filter;

const buildEntries = function (dir) {
    'use strict';
    recursiveLs(dir).filter(name => /.+-spec\.js/.test(name)).forEach(function (f) {
        if (!testFilter || f.indexOf(testFilter) >= 0) {
            entries[f] = path.join(dir, f);
        }
    });
};

buildEntries(path.resolve(__dirname, 'test'));

const webpack = require('webpack');
const localConfig = require('./config.local.json');

module.exports = {
    mode: 'development',
    entry: entries,
    devtool: 'source-map',
    output: {
        path: path.resolve(__dirname, 'testem', 'compiled'),
        filename: '[name]'
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env.VAULT_URL': JSON.stringify(localConfig.vaultUrl),
            'process.env.CLIENT_ID': JSON.stringify(localConfig.clientId)
        })
    ]
};
