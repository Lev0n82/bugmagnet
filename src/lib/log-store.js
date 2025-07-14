// Simple in-memory log store using chrome.storage.local for persistence
module.exports = {
	addLog: function (msg) {
		const entry = { msg, ts: new Date().toISOString() };
		chrome.storage.local.get(['bugMagnetLogs'], function(result) {
			const logs = result.bugMagnetLogs || [];
			logs.push(entry);
			chrome.storage.local.set({ bugMagnetLogs: logs });
		});
	},
	getLogs: function (cb) {
		chrome.storage.local.get(['bugMagnetLogs'], function(result) {
			cb(result.bugMagnetLogs || []);
		});
	},
	clearLogs: function () {
		chrome.storage.local.remove('bugMagnetLogs');
	}
};
