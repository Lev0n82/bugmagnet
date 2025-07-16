module.exports = function ChromeBrowserInterface(chrome) {
	'use strict';
	const self = this;
	self.saveOptions = function (options) {
		return new Promise((resolve, reject) => {
			chrome.storage.sync.get(null, existing => {
				const merged = Object.assign({}, existing, options);
				chrome.storage.sync.set(merged, () => {
					if (chrome.runtime.lastError) {
						reject(chrome.runtime.lastError);
					} else {
						resolve();
					}
				});
			});
		});
	};
	self.getOptionsAsync = function () {
		return new Promise((resolve) => {
			chrome.storage.sync.get(null, resolve);
		});
	};
	self.openSettings = function () {
		if (chrome.runtime.openOptionsPage) {
			chrome.runtime.openOptionsPage();
		} else {
			// window.open is not available in service worker context; fallback is not needed in MV3
			// In MV3, openOptionsPage is always available
		}
	};
	self.openUrl = function (url) {
		// window.open is not available in service worker context; use chrome.tabs.create instead
		if (chrome.tabs && chrome.tabs.create) {
			chrome.tabs.create({ url });
		}
	};
	self.addStorageListener = function (listener) {
		chrome.storage.onChanged.addListener(function (changes, areaName) {
			if (areaName === 'sync') {
				listener(changes);
			}
		});
	};
	self.getRemoteFile = function (url) {
		return fetch(url, {mode: 'cors'}).then(function (response) {
			if (response.ok) {
				return response.text();
			}
			throw new Error('Network error reading the remote URL');
		});
	};
	self.closeWindow = function () {
		// window.close is not available in service worker context; do nothing
	};
	self.readFile = function (fileInfo) {
		return new Promise((resolve, reject) => {
			const oFReader = new FileReader();
			oFReader.onload = function (oFREvent) {
				try {
					resolve(oFREvent.target.result);
				} catch (e) {
					reject(e);
				}
			};
			oFReader.onerror = reject;
			oFReader.readAsText(fileInfo, 'UTF-8');
		});
	};
        self.executeScript = function (tabId, source) {
                return new Promise((resolve) => {
                        if (chrome.scripting && chrome.scripting.executeScript) {
                                chrome.scripting.executeScript({
                                        target: { tabId: tabId },
                                        files: [source]
                                }, () => resolve());
                        } else if (chrome.tabs && chrome.tabs.executeScript) {
                                chrome.tabs.executeScript(tabId, {file: source}, resolve);
                        } else {
                                resolve();
                        }
                });
        };
	self.sendMessage = function (tabId, message) {
		return chrome.tabs.sendMessage(tabId, message);
	};

	self.requestPermissions = function (permissionsArray) {
		return new Promise((resolve, reject) => {
			try {
				chrome.permissions.request({permissions: permissionsArray}, function (granted) {
					if (granted) {
						resolve();
					} else {
						reject();
					}
				});
			} catch (e) {
				console.log(e);
				reject(e);
			}
		});
	};
	self.removePermissions = function (permissionsArray) {
		return new Promise((resolve) => chrome.permissions.remove({permissions: permissionsArray}, resolve));
	};
        self.copyToClipboard = function (text) {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(text).catch(() => {
                                const handler = function (e) {
                                        e.clipboardData.setData('text/plain', text);
                                        e.preventDefault();
                                };
                                document.addEventListener('copy', handler);
                                document.execCommand('copy');
                                document.removeEventListener('copy', handler);
                        });
                } else {
                        const handler = function (e) {
                                e.clipboardData.setData('text/plain', text);
                                e.preventDefault();
                        };
                        document.addEventListener('copy', handler);
                        document.execCommand('copy');
                        document.removeEventListener('copy', handler);
                }
        };
        self.showMessage = function (text) {
                const code = `alert(${JSON.stringify(text)})`;
                if (chrome.scripting && chrome.tabs) {
                        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                                const activeTab = tabs && tabs[0];
                                if (activeTab) {
                                        chrome.scripting.executeScript({
                                                target: { tabId: activeTab.id },
                                                func: (msg) => alert(msg),
                                                args: [text]
                                        });
                                }
                        });
                } else if (chrome.tabs && chrome.tabs.executeScript) {
                        chrome.tabs.executeScript(null, {code});
                }
        };
	// Add a createContextMenu method to ensure id is passed as a string
	self.createContextMenu = function (props) {
		if (props && props.id) {
			props.id = String(props.id); // Ensure id is a string
		}
		return chrome.contextMenus.create(props);
	};
};

