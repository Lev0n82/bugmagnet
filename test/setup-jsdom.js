// Polyfill window.prompt and window.alert for all tests
(function polyfillPromptAlert() {
  const promptPoly = function() { return null; };
  const alertPoly = function() { };
  if (typeof global.prompt !== 'function') global.prompt = promptPoly;
  if (typeof global.alert !== 'function') global.alert = alertPoly;
  // Polyfill on window, even if window is not yet defined
  Object.defineProperty(global, 'window', {
    configurable: true,
    get: function() {
      if (!this._window) {
        this._window = {};
      }
      if (typeof this._window.prompt !== 'function') this._window.prompt = promptPoly;
      if (typeof this._window.alert !== 'function') this._window.alert = alertPoly;
      return this._window;
    },
    set: function(val) {
      if (val) {
        if (typeof val.prompt !== 'function') val.prompt = promptPoly;
        if (typeof val.alert !== 'function') val.alert = alertPoly;
      }
      this._window = val;
    }
  });
})();

// Helper to extract vaultUrl and clientId from config.local.json for tests
const path = require('path');
const fs = require('fs');
const configPath = path.resolve(__dirname, '../config.local.json');
let testVaultConfig = { vaultUrl: '', clientId: '' };
try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (config.vaults && config.vaults.length > 0) {
    // Try common keys for vaultUrl and clientId
    const vault = config.vaults[0];
    testVaultConfig.vaultUrl = vault.vaultUrl || vault.vaultUri || config.vaultUri || 'https://qa-dev-sc.vault.azure.net/';
    testVaultConfig.clientId = vault.clientId || vault.objectId || config.clientId || 'test-client-id';
  } else {
    testVaultConfig.vaultUrl = config.vaultUri || 'https://qa-dev-sc.vault.azure.net/';
    testVaultConfig.clientId = config.clientId || 'test-client-id';
  }
} catch (e) {
  // fallback: use dummy values for tests
  testVaultConfig.vaultUrl = 'https://qa-dev-sc.vault.azure.net/';
  testVaultConfig.clientId = 'test-client-id';
}
global.testVaultConfig = testVaultConfig;
// (Polyfill already applied above)
// Polyfill fetch, prompt, and alert on both global and window
function polyfillBrowserAPIs() {
  const fetchPoly = async function() { return Promise.resolve({ ok: true, json: async () => ({}), text: async () => '' }); };
  const promptPoly = function() { return null; };
  const alertPoly = function() { };

  // Polyfill on global
  if (typeof global.fetch !== 'function') {
    global.fetch = fetchPoly;
  }
  if (typeof global.prompt !== 'function') {
    global.prompt = promptPoly;
  }
  if (typeof global.alert !== 'function') {
    global.alert = alertPoly;
  }

  // Polyfill on window if available
  if (typeof global.window !== 'undefined' && global.window) {
    if (typeof global.window.fetch !== 'function') {
      global.window.fetch = fetchPoly;
    }
    if (typeof global.window.prompt !== 'function') {
      global.window.prompt = promptPoly;
    }
    if (typeof global.window.alert !== 'function') {
      global.window.alert = alertPoly;
    }
  }
}

polyfillBrowserAPIs();
const { JSDOM } = require('jsdom');

if (!global.__JSDOM_SETUP__) {
  global.__JSDOM_SETUP__ = true;
  if (!global.JSDOM) {
    global.JSDOM = require('jsdom').JSDOM;
  }

  // Set up jsdom globally before any test files are loaded
  var globalDom = new global.JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
  global.window = globalDom.window;
  global.document = globalDom.window.document;
  global.HTMLElement = globalDom.window.HTMLElement;
  global.Node = globalDom.window.Node;
  global.navigator = globalDom.window.navigator;


  beforeEach(function() {
    // For test isolation, create a new jsdom instance for each test
    var dom = new global.JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
    global.window = dom.window;
    global.document = dom.window.document;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;
    global.navigator = dom.window.navigator;
    polyfillBrowserAPIs();
  });

  afterEach(function() {
    delete global.window;
    delete global.document;
    delete global.HTMLElement;
    delete global.Node;
    delete global.navigator;
    // Restore the initial global jsdom after each test
    global.window = globalDom.window;
    global.document = globalDom.window.document;
    global.HTMLElement = globalDom.window.HTMLElement;
    global.Node = globalDom.window.Node;
    global.navigator = globalDom.window.navigator;
  });
}
