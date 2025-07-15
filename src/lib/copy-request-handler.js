const getRequestValue = require('./get-request-value');
module.exports = function copyRequestHandler(browserInterface, tabId, request) {
	'use strict';
	browserInterface.copyToClipboard(getRequestValue(request));
};
