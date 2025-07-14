require('./setup-jsdom');
    describe('Login preloader and feedback', () => {
        let originalGetAuthToken;
        beforeEach(() => {
            // Patch CredentialManager to allow spying on getAuthToken
            originalGetAuthToken = CredentialManager.prototype.getAuthToken;
        });
        afterEach(() => {
            CredentialManager.prototype.getAuthToken = originalGetAuthToken;
        });

        it('shows preloader with Connecting... and success message on successful login', async () => {
            // Patch getAuthToken to resolve
            CredentialManager.prototype.getAuthToken = jasmine.createSpy().and.returnValue(Promise.resolve('token123'));
            initCredentialWidget(domFixture, browserInterface);
            await Promise.resolve();
            const loginBtn = domFixture.querySelector('[role=auth-login]');
            loginBtn.style.display = 'inline-block'; // ensure visible
            loginBtn.click();
            // Preloader should show Connecting...
            const preloader = domFixture.querySelector('.preloader-overlay');
            const preloaderMsg = preloader.querySelector('.preloader-message');
            expect(preloader.style.display).toBe('flex');
            expect(preloaderMsg.textContent).toContain('Connecting');
            // Wait for async login
            await new Promise(r => setTimeout(r, 10));
            // Should show success message
            expect(preloaderMsg.textContent).toContain('Success');
        });

        it('shows preloader with Connecting... and failure message on failed login', async () => {
            // Patch getAuthToken to reject
            CredentialManager.prototype.getAuthToken = jasmine.createSpy().and.returnValue(Promise.reject(new Error('Auth failed')));
            initCredentialWidget(domFixture, browserInterface);
            await Promise.resolve();
            const loginBtn = domFixture.querySelector('[role=auth-login]');
            loginBtn.style.display = 'inline-block';
            loginBtn.click();
            const preloader = domFixture.querySelector('.preloader-overlay');
            const preloaderMsg = preloader.querySelector('.preloader-message');
            expect(preloader.style.display).toBe('flex');
            expect(preloaderMsg.textContent).toContain('Connecting');
            // Wait for async login
            await new Promise(r => setTimeout(r, 10));
            expect(preloaderMsg.textContent).toContain('Failed');
            expect(preloaderMsg.textContent).toContain('Auth failed');
        });
    });
/*global describe, it, expect, beforeEach, afterEach, spyOn, jasmine*/
const initCredentialWidget = require('../src/lib/init-credential-widget');
const CredentialManager = require('../src/lib/credential-manager');

describe('initCredentialWidget', () => {
    'use strict';
    let domFixture, browserInterface, credentialManager, chrome;

    beforeEach(() => {
        domFixture = document.createElement('div');
        domFixture.innerHTML = `
            <div id="credentials">
                <h2>Credential Settings</h2>
                <div role="cred-status" class="status"></div>
                <div>
                    Authentication Status: <span role="auth-status">Unknown</span>
                    <button role="auth-login" style="display: none;">Login</button>
                </div>
                <div>Vault URL: <input type="text" role="vault-url" placeholder="https://myvault.vault.azure.net"/></div>
                <hr/>
                <h3>Account Grouping Rules</h3>
                <div class="container">
                    <table role="grouping-rules-table">
                        <thead>
                            <tr><th>Group Name</th><th>RegEx Pattern</th><th></th></tr>
                        </thead>
                        <tbody>
                            <tr role="template">
                                <td><input type="text" role="group-name" /></td>
                                <td><input type="text" role="group-pattern" /></td>
                                <td><button role="remove-rule">Remove</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <button role="add-rule">Add Rule</button>
                <hr/>
                <h3>Test Accounts</h3>
                <button role="sync-accounts">Sync Accounts from Vault</button>
                <div class="container" role="accounts-container">
                    <ul role="accounts-list"></ul>
                </div>
                <button role="save-credentials">Save Settings</button>
            </div>
        `;
        document.body.appendChild(domFixture);

        const initialOptions = {
            vaultUrl: 'https://fake.vault.azure.net',
            groupingRules: [
                { name: 'Group1', pattern: 'Pattern1' },
                { name: 'Group2', pattern: 'Pattern2' }
            ],
            accounts: ['account1', 'account2']
        };

        browserInterface = {
            getOptionsAsync: jasmine.createSpy('getOptionsAsync').and.returnValue(Promise.resolve(initialOptions)),
            saveOptions: jasmine.createSpy('saveOptions').and.returnValue(Promise.resolve())
        };

        credentialManager = new CredentialManager(browserInterface);
        spyOn(credentialManager, 'listAndGroupSecrets');

        chrome = {
            identity: {
                getAuthToken: jasmine.createSpy('getAuthToken').and.callFake((options, callback) => {
                    callback('fake-token');
                })
            },
            runtime: {}
        };
        
        window.chrome = chrome;

        spyOn(window, 'CredentialManager').and.returnValue(credentialManager);
    });

    afterEach(() => {
        document.body.removeChild(domFixture);
        window.chrome = undefined;
    });

    it('initializes the widget with options from browserInterface', async () => {
        initCredentialWidget(domFixture, browserInterface);
        await Promise.resolve(); // allow promises to resolve

        expect(domFixture.querySelector('[role=vault-url]').value).toBe('https://fake.vault.azure.net');
        
        const rules = domFixture.querySelectorAll('[role=grouping-rules-table] tbody tr');
        expect(rules.length).toBe(2);
        expect(rules[0].querySelector('[role=group-name]').value).toBe('Group1');
        expect(rules[0].querySelector('[role=group-pattern]').value).toBe('Pattern1');
        expect(rules[1].querySelector('[role=group-name]').value).toBe('Group2');
        expect(rules[1].querySelector('[role=group-pattern]').value).toBe('Pattern2');

        const accounts = domFixture.querySelectorAll('[role=accounts-list] li');
        expect(accounts.length).toBe(2);
        expect(accounts[0].textContent).toBe('account1');
        expect(accounts[1].textContent).toBe('account2');
    });

    it('adds a new rule when "Add Rule" is clicked', () => {
        initCredentialWidget(domFixture, browserInterface);
        
        domFixture.querySelector('[role=add-rule]').click();

        const rules = domFixture.querySelectorAll('[role=grouping-rules-table] tbody tr');
        expect(rules.length).toBe(3);
        expect(rules[2].querySelector('[role=group-name]').value).toBe('');
        expect(rules[2].querySelector('[role=group-pattern]').value).toBe('');
    });

    it('removes a rule when its "Remove" button is clicked', async () => {
        initCredentialWidget(domFixture, browserInterface);
        await Promise.resolve();

        domFixture.querySelector('[role=remove-rule]').click();

        const rules = domFixture.querySelectorAll('[role=grouping-rules-table] tbody tr');
        expect(rules.length).toBe(1);
        expect(rules[0].querySelector('[role=group-name]').value).toBe('Group2');
    });

    it('saves settings when "Save Settings" is clicked', async () => {
        initCredentialWidget(domFixture, browserInterface);
        await Promise.resolve();

        domFixture.querySelector('[role=vault-url]').value = 'https://new.vault.azure.net';
        domFixture.querySelector('[role=add-rule]').click();
        const rules = domFixture.querySelectorAll('[role=grouping-rules-table] tbody tr');
        rules[2].querySelector('[role=group-name]').value = 'Group3';
        rules[2].querySelector('[role=group-pattern]').value = 'Pattern3';

        domFixture.querySelector('[role=save-credentials]').click();
        await Promise.resolve();

        expect(browserInterface.saveOptions).toHaveBeenCalledWith(jasmine.objectContaining({
            vaultUrl: 'https://new.vault.azure.net',
            groupingRules: [
                { name: 'Group1', pattern: 'Pattern1' },
                { name: 'Group2', pattern: 'Pattern2' },
                { name: 'Group3', pattern: 'Pattern3' }
            ]
        }));
    });

    describe('Sync Accounts', () => {
        it('calls listAndGroupSecrets and updates accounts on success', async () => {
            const newAccounts = { 'NewGroup': ['new-account1', 'new-account2'] };
            credentialManager.listAndGroupSecrets.and.returnValue(Promise.resolve(newAccounts));
            initCredentialWidget(domFixture, browserInterface);
            
            domFixture.querySelector('[role=sync-accounts]').click();
            await Promise.resolve(); // for listAndGroupSecrets
            await Promise.resolve(); // for saveOptions

            expect(credentialManager.listAndGroupSecrets).toHaveBeenCalled();
            
            const accounts = domFixture.querySelectorAll('[role=accounts-list] li');
            expect(accounts.length).toBe(2);
            expect(accounts[0].textContent).toBe('new-account1');
            expect(accounts[1].textContent).toBe('new-account2');

            expect(browserInterface.saveOptions).toHaveBeenCalledWith(jasmine.objectContaining({
                accounts: newAccounts
            }));

            const status = domFixture.querySelector('[role=cred-status]');
            expect(status.textContent).toBe('Sync complete!');
            expect(status.style.color).toBe('green');
        });

        it('shows an error message on sync failure', async () => {
            const error = new Error('Sync Failed');
            credentialManager.listAndGroupSecrets.and.returnValue(Promise.reject(error));
            initCredentialWidget(domFixture, browserInterface);

            domFixture.querySelector('[role=sync-accounts]').click();
            await Promise.resolve();

            const status = domFixture.querySelector('[role=cred-status]');
            expect(status.textContent).toBe('Error syncing: Sync Failed');
            expect(status.style.color).toBe('red');
        });
    });
});
