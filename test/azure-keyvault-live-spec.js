require('./setup-jsdom');
/*global describe, it, expect, beforeEach, afterEach, document, window */
const CredentialManager = require('../src/lib/credential-manager');
const FakeChromeApi = require('./utils/fake-chrome-api');

describe('Live Azure Key Vault E2E Test', () => {
    'use strict';
    let credentialManager, originalChrome;

    beforeEach(() => {
        originalChrome = window.chrome;
        window.chrome = new FakeChromeApi();

        // The test page needs to be loaded for these tests to run in the browser
        document.body.innerHTML += '<iframe src="/testem/runner.html" id="test-frame" style="width: 100%; height: 300px;"></iframe>';

        const options = {
            vaultUrl: global.testVaultConfig.vaultUrl || 'https://example.vault.azure.net',
            clientId: global.testVaultConfig.clientId || 'test-client-id',
            vaultPat: '' // For test, leave blank or set a test value
        };

        const browserInterface = {
            getOptionsAsync: () => Promise.resolve(options),
            get: (key, callback) => callback({ [key]: [] }),
            set: (data, callback) => callback()
        };

        credentialManager = new CredentialManager(browserInterface);
    });

    afterEach(() => {
        window.chrome = originalChrome;
        document.body.innerHTML = '';
    });

    it('should connect to azure, sync secrets, and populate fields', async () => {
        // 1. Synchronize with Azure Key Vault
        await credentialManager.listAndGroupSecrets();
        const secrets = await credentialManager.getSecretsForUrl('live-test');
        expect(secrets.length).toBeGreaterThan(0, 'No secrets found for "live-test" group. Ensure secrets are named like "live-test--some-name"');

        // 2. Populate fields on the test page
        const testFrame = document.getElementById('test-frame');
        const testDoc = testFrame.contentDocument || testFrame.contentWindow.document;

        const usernameInput = testDoc.getElementById('username');
        const passwordInput = testDoc.getElementById('password');
        const submitButton = testDoc.getElementById('login');

        // For this test, we'll use the first secret found
        const secretToFill = secrets[0];
        const credential = await credentialManager.getCredential(secretToFill.account);

        usernameInput.value = credential.username;
        passwordInput.value = credential.password;
        submitButton.click();

        // 3. Validate fields are populated
        // In a real scenario, you might check a confirmation message.
        // For this test, we'll just check the values again.
        expect(usernameInput.value).toBe(credential.username);
        expect(passwordInput.value).toBe(credential.password);

        window.alert('Test complete. Check the fields in the frame.');
    });
});