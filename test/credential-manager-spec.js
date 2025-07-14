require('./setup-jsdom');
/*global describe, it, expect, beforeEach, afterEach, jasmine*/
const CredentialManager = require('../src/lib/credential-manager'),
    testData = require('./data/accounts.json');

describe('CredentialManager with Azure Key Vault', () => {
    'use strict';
    let browserInterface, manager;

    describe('with fetch mock', () => {
        let fetchSpy;
        beforeEach(() => {
            fetchSpy = jasmine.createSpy('fetch');
            global.fetch = fetchSpy;
            browserInterface = jasmine.createSpyObj('browserInterface', ['getOptionsAsync', 'executeScript', 'sendMessage']);
            browserInterface.getOptionsAsync.and.returnValue(Promise.resolve({
                ...testData,
                vaultUrl: global.testVaultConfig.vaultUrl || testData.vaultUrl,
                clientId: global.testVaultConfig.clientId || 'test-client-id'
            }));
            browserInterface.executeScript.and.returnValue(Promise.resolve());
            browserInterface.sendMessage.and.returnValue(Promise.resolve());
            manager = new CredentialManager(browserInterface);
        });

        afterEach(() => {
            delete global.fetch;
        });

        it('fills credentials from Azure Key Vault on the page', done => {
            fetchSpy.and.returnValue(Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ value: 'secret-pass' })
            }));
            manager.fillCredentials(42, testData.accounts[0]).then(() => {
                expect(fetchSpy).toHaveBeenCalled();
                expect(browserInterface.executeScript).toHaveBeenCalledWith(42, '/credential-fill.js');
                expect(browserInterface.sendMessage).toHaveBeenCalledWith(42, { username: testData.accounts[0], password: 'secret-pass' });
            }).then(done, done.fail);
        });

        it('updates password in Azure Key Vault', done => {
            fetchSpy.and.returnValue(Promise.resolve({ ok: true }));
            manager.updatePassword(testData.accounts[0], 'newpass').then(() => {
                expect(fetchSpy).toHaveBeenCalled();
            }).then(done, done.fail);
        });
    });

    describe('with client mock', () => {
        let mockClient;
        const mockSecrets = [
            { name: 'user1--domain-com' },
            { name: 'user2--domain-com' },
            { name: 'admin--domain-com' },
            { name: 'other-user--another-domain-com' }
        ];

        const mockGroupingRules = [
            { name: 'Domain Users', pattern: '.*@domain\\.com' },
            { name: 'Admins', pattern: '^admin@.*' }
        ];

        beforeEach(() => {
            mockClient = jasmine.createSpyObj('AzureKeyVaultClient', ['listSecrets', 'getSecret', 'setSecret']);
            mockClient.listSecrets.and.returnValue(Promise.resolve(mockSecrets));
            mockClient.getSecret.and.callFake(secretName => Promise.resolve(`${secretName}-password`));
            mockClient.setSecret.and.returnValue(Promise.resolve());

            browserInterface = jasmine.createSpyObj('browserInterface', ['getOptionsAsync', 'executeScript', 'sendMessage']);
            browserInterface.getOptionsAsync.and.returnValue(Promise.resolve({
                vaultUrl: 'https://fake.vault.azure.net',
                groupingRules: mockGroupingRules
            }));

            manager = new CredentialManager(browserInterface);
            // Manually inject the mock client and options to avoid interfering with other tests
            manager.client = mockClient;
            manager.options = {
                vaultUrl: 'https://fake.vault.azure.net',
                groupingRules: mockGroupingRules
            };
        });

        describe('listAndGroupSecrets', () => {
            it('should call listSecrets on the client', async () => {
                await manager.listAndGroupSecrets();
                expect(mockClient.listSecrets).toHaveBeenCalled();
            });

            it('should apply reverse name conversion to secrets', async () => {
                const fromSecretNameSpy = spyOn(manager, 'fromSecretName').and.callThrough();
                await manager.listAndGroupSecrets();
                expect(fromSecretNameSpy).toHaveBeenCalledWith('user1--domain-com');
                expect(fromSecretNameSpy).toHaveBeenCalledTimes(mockSecrets.length);
            });

            it('should group secrets according to groupingRules', async () => {
                const grouped = await manager.listAndGroupSecrets();
                expect(grouped['Domain Users']).toContain('user1@domain.com');
                expect(grouped['Domain Users']).toContain('user2@domain.com');
                expect(grouped['Domain Users']).toContain('admin@domain.com');
                expect(grouped['Admins']).toContain('admin@domain.com');
            });

            it('should place non-matching accounts in "Ungrouped"', async () => {
                const grouped = await manager.listAndGroupSecrets();
                expect(grouped.Ungrouped[0]).toBe('other.user@another.domain.com');
            });
            
            it('should correctly convert uft@ontatio.ca', async () => {
                const fromSecretNameSpy = spyOn(manager, 'fromSecretName').and.callThrough();
                const toSecretNameSpy = spyOn(manager.client, 'toSecretName').and.callThrough();

                manager.fromSecretName('uft--ontatio-ca');
                expect(fromSecretNameSpy).toHaveReturned('uft@ontatio.ca');

                manager.client.toSecretName('uft@ontatio.ca');
                expect(toSecretNameSpy).toHaveReturned('uft--ontatio-ca');
            });
        });

        describe('getSecret caching', () => {
            const secretId = 'test@example.com';

            it('should call the client on the first call', async () => {
                await manager.getSecret(secretId);
                expect(mockClient.getSecret).toHaveBeenCalledWith(secretId);
                expect(mockClient.getSecret.calls.count()).toBe(1);
            });

            it('should use the cache on the second call', async () => {
                await manager.getSecret(secretId);
                await manager.getSecret(secretId);
                expect(mockClient.getSecret.calls.count()).toBe(1);
            });

            it('should clear the cache after updatePassword is called', async () => {
                await manager.getSecret(secretId);
                expect(mockClient.getSecret.calls.count()).toBe(1);

                await manager.updatePassword(secretId, 'new-password');
                expect(mockClient.setSecret).toHaveBeenCalledWith(secretId, 'new-password');

                await manager.getSecret(secretId);
                expect(mockClient.getSecret.calls.count()).toBe(2);
            });
        });
    });
    
    describe('with PAT token', () => {
        const pat = '2dpAi3kNbm7x6g3gGjBjDhPQpqy7vcKpzSc4epXZGSyN1RNjLbulJQQJ99BFACAAAAAqq63JAAASAZDO16mK';
        let getAuthTokenSpy;

        beforeEach(() => {
            jasmine.createSpyObj('AzureKeyVaultClient', ['getAuthToken', 'getSecret']);
            getAuthTokenSpy = spyOn(AzureKeyVaultClient.prototype, 'getAuthToken').and.callThrough();

            browserInterface = jasmine.createSpyObj('browserInterface', ['getOptionsAsync', 'executeScript', 'sendMessage']);
            browserInterface.getOptionsAsync.and.returnValue(Promise.resolve({
                vaultUrl: 'https://fake.vault.azure.net',
                vaultPat: pat
            }));
            
            manager = new CredentialManager(browserInterface);
        });

        it('should use the PAT token instead of interactive login', async () => {
            await manager.loadOptions();
            const token = await manager.client.getAuthToken();
            expect(token).toBe(pat);
            expect(getAuthTokenSpy).toHaveBeenCalled();
        });
    });
    
    it('should always reload options to get the latest configuration', async () => {
        const initialOptions = { vaultUrl: 'https://initial.vault.azure.net' };
        const updatedOptions = { vaultUrl: 'https://updated.vault.azure.net' };
        
        browserInterface.getOptionsAsync.and.returnValue(Promise.resolve(initialOptions));
        await manager.loadOptions();
        expect(manager.client.vaultUrl).toBe('https://initial.vault.azure.net');

        browserInterface.getOptionsAsync.and.returnValue(Promise.resolve(updatedOptions));
        await manager.loadOptions();
        expect(manager.client.vaultUrl).toBe('https://updated.vault.azure.net');
    });
});
