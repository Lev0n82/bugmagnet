/*global require, module, __dirname */
const path = require('path'),
	recursiveLs = require('fs-readdir-recursive'),
	entries = {},
	buildEntries = function (dir) {
		'use strict';
		recursiveLs(dir).forEach(function (f) {
			entries[f] = path.join(dir, f);
		});
	};
//buildEntries('core');
buildEntries(path.resolve(__dirname, 'src', 'main'));
const webpack = require('webpack');
const localConfig = require('./config.local.json');

module.exports = {
	mode: 'production',
	entry: entries,
	output: {
		path: path.resolve(__dirname, 'pack'),
		filename: '[name]'
	},
	plugins: [
		new webpack.DefinePlugin({
			'process.env.VAULT_URL': JSON.stringify(localConfig.vaultUrl),
			'process.env.CLIENT_ID': JSON.stringify(localConfig.clientId)
		})
	]
};
