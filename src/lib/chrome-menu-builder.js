module.exports = function ChromeMenuBuilder(chrome) {
	'use strict';
	let itemValues = {},
		itemHandlers = {};
	const self = this,
		contexts = ['editable'];
	const logStore = require('./log-store');
	function uniqueMenuId(prefix) {
		return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}
	self.rootMenu = function (title) {
		logStore.addLog('Creating root menu: ' + title);
		return chrome.contextMenus.create({
			'title': title,
			'contexts': contexts,
			id: uniqueMenuId('root')
		});
	};
	self.subMenu = function (title, parentMenu) {
		logStore.addLog('Creating submenu: ' + title);
		return chrome.contextMenus.create({
			'title': title,
			'parentId': parentMenu,
			'contexts': contexts,
			id: uniqueMenuId('submenu')
		});
	};
	self.separator = function (parentMenu) {
		logStore.addLog('Creating separator under parent: ' + parentMenu);
		return chrome.contextMenus.create({
			'type': 'separator',
			'parentId': parentMenu,
			'contexts': contexts,
			id: uniqueMenuId('separator')
		});
	};
	self.menuItem = function (title, parentMenu, clickHandler, value) {
		logStore.addLog('Creating menu item: ' + title);
		const id = uniqueMenuId('item');
		chrome.contextMenus.create({
			'title': title,
			'parentId': parentMenu,
			'contexts': contexts,
			id
		});
		itemValues[id] = value;
		itemHandlers[id] = clickHandler;
		return id;
	};
	self.choice  = function (title, parentMenu, clickHandler, value) {
		logStore.addLog('Creating radio choice: ' + title);
		const id = uniqueMenuId('choice');
		chrome.contextMenus.create({
			type: 'radio',
			checked: value,
			title: title,
			parentId: parentMenu,
			'contexts': contexts,
			id
		});
		itemHandlers[id] = clickHandler;
		return id;
	};
	self.removeAll = function () {
		itemValues = {};
		itemHandlers = {};
		return new Promise(resolve => chrome.contextMenus.removeAll(resolve));
	};
	chrome.contextMenus.onClicked.addListener((info, tab) => {
		const itemId = info && info.menuItemId;
		if (itemHandlers[itemId]) {
			itemHandlers[itemId](tab.id, itemValues[itemId]);
		}
	});
	self.selectChoice = function (menuId) {
		return chrome.contextMenus.update(menuId, {checked: true});
	};
};
// No references to `window` or other browser globals are present in this file.
// All code is compatible with service worker context.
