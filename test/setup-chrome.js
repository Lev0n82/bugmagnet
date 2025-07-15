// Minimal chrome mock for Jasmine/jsdom test environment
if (!global.chrome) {
  global.chrome = {
    storage: {
      sync: {
        get: (keys, cb) => cb({}),
        set: (items, cb) => cb && cb(),
      },
      onChanged: {
        addListener: () => {},
      },
    },
    runtime: {
      lastError: null,
      openOptionsPage: () => {},
    },
    tabs: {
      create: () => {},
      executeScript: (tabId, details, cb) => cb && cb(),
      sendMessage: () => {},
    },
    permissions: {
      request: (obj, cb) => cb && cb(true),
      remove: (obj, cb) => cb && cb(true),
    },
    contextMenus: {
      create: () => {},
    },
    identity: {
      getRedirectURL: () => 'http://localhost/',
      launchWebAuthFlow: (_, cb) => cb('http://localhost/#access_token=fake'),
    },
  };
}
