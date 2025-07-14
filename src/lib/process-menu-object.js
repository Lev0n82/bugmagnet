const CredentialManager = require('./credential-manager');
const ChromeBrowserInterface = require('./chrome-browser-interface');
/*global chrome*/
const credentialManager = new CredentialManager(new ChromeBrowserInterface(chrome));

module.exports = function processMenuObject(configObject, menuBuilder, parentMenu, onClick) {
	'use strict';
	const getTitle = function (key) {
		if (configObject instanceof Array) {
			return configObject[key];
		}
		return key;
	};
	if (!configObject) {
		return;
	}
	Object.keys(configObject).forEach(function (key) {
		const value = configObject[key],
			title = getTitle(key);
		let result;
		if (typeof (value) === 'string' || (typeof (value) === 'object' && value.hasOwnProperty('_type'))) {
			const staticOnClick = (info, tab) => onClick(info, tab, value);
			menuBuilder.menuItem(title, parentMenu, staticOnClick, value);
		} else if (typeof (value) === 'object' && value.hasOwnProperty('keyVaultSecret')) {
			const secretName = value.keyVaultSecret;
			const dynamicOnClick = (info, tab) => {
				credentialManager.getSecret(secretName)
					.then(secretValue => onClick(info, tab, secretValue))
					.catch(err => console.error(`Failed to fetch secret ${secretName}:`, err));
			};
			menuBuilder.menuItem(title, parentMenu, dynamicOnClick, value);
		} else if (typeof (value) === 'object') {
			result = menuBuilder.subMenu(title, parentMenu);
			processMenuObject(value, menuBuilder, result, onClick);
		}
	});
};

