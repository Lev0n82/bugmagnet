/*global chrome */
const ChromeConfigInterface = require('../lib/chrome-browser-interface'),
	initConfigWidget = require('../lib/init-config-widget'),
	initCredentialWidget = require('../lib/init-credential-widget'),
	logStore = require('../lib/log-store');
document.addEventListener('DOMContentLoaded', function () {
	'use strict';
	const iface = new ChromeConfigInterface(chrome);
	const CredentialContextMenu = require('../lib/credential-context-menu');
	new CredentialContextMenu(iface).init();
	initConfigWidget(document.getElementById('main'), iface);
	initCredentialWidget(document.getElementById('credentials'), iface);

	// Add handler for Test Page button
	const testPageBtn = document.querySelector('button[role="test-page"]');
	if (testPageBtn) {
		testPageBtn.addEventListener('click', function (e) {
			e.preventDefault();
			window.open('testpage.html', '_blank');
		});
	}

	// Add handler for View Logs button
	const viewLogsBtn = document.querySelector('button[role="view-logs"]');
	if (viewLogsBtn) {
		viewLogsBtn.addEventListener('click', function (e) {
			e.preventDefault();
			logStore.getLogs(function(logs) {
				let logText = logs.map(l => `[${l.ts}] ${l.msg}`).join('\n');
				if (!logText) logText = 'No logs.';
				const logWin = window.open('', '_blank', 'width=600,height=400');
				logWin.document.write('<pre>' + logText.replace(/</g, '&lt;') + '</pre>');
			});
		});
	}
});
