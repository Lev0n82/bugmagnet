require('./setup-jsdom');
/*global describe, it, expect, beforeEach, jasmine, spyOn, global*/
const CredentialManager = require('../src/lib/credential-manager');
const AzureKeyVaultClient = require('../src/lib/azure-keyvault-client');

describe('End-to-End Azure Key Vault Integration', () => {
    'use strict';
    let browserInterface, manager;

    beforeEach(() => {
        browserInterface = jasmine.createSpyObj('browserInterface', ['getOptionsAsync']);
    });

    it('should use PAT token for authentication when provided', async () => {
        const pat = 'test-pat-token';
        browserInterface.getOptionsAsync.and.returnValue(Promise.resolve({
            vaultUrl: 'https://fake.vault.azure.net',
            clientId: global.testVaultConfig.clientId || 'test-client-id',
            vaultPat: pat
        }));
        
        const fetchSpy = spyOn(global, 'fetch').and.returnValue(Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ value: [] })
        }));

        manager = new CredentialManager(browserInterface);
        await manager.listAndGroupSecrets();

        expect(fetchSpy).toHaveBeenCalled();
        const fetchOptions = fetchSpy.calls.mostRecent().args[1];
        expect(fetchOptions.headers.Authorization).toBe(`Bearer ${pat}`);
    });

    it('should use OAuth for authentication when no PAT is provided', async () => {
        browserInterface.getOptionsAsync.and.returnValue(Promise.resolve({
            vaultUrl: 'https://fake.vault.azure.net',
            clientId: global.testVaultConfig.clientId || 'test-client-id'
        }));

        const getAuthTokenSpy = spyOn(AzureKeyVaultClient.prototype, 'getAuthToken').and.returnValue(Promise.resolve('test-oauth-token'));
        
        spyOn(global, 'fetch').and.returnValue(Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ value: [] })
        }));

        manager = new CredentialManager(browserInterface);
        await manager.listAndGroupSecrets();

        expect(getAuthTokenSpy).toHaveBeenCalled();
    });

    it('should pre-cache all secrets after a successful sync', async () => {
        const mockSecrets = [{ name: 'user1--domain-com' }, { name: 'user2--domain-com' }];
        browserInterface.getOptionsAsync.and.returnValue(Promise.resolve({
            vaultUrl: 'https://fake.vault.azure.net',
            clientId: global.testVaultConfig.clientId || 'test-client-id'
        }));

        spyOn(AzureKeyVaultClient.prototype, 'listSecrets').and.returnValue(Promise.resolve(mockSecrets));
        spyOn(AzureKeyVaultClient.prototype, 'getSecret').and.callFake(secretName => Promise.resolve(`${secretName}-password`));

        manager = new CredentialManager(browserInterface);
        await manager.listAndGroupSecrets();

        expect(manager.cache.size).toBe(2);
        expect(manager.cache.get('user1@domain.com').value).toBe('user1@domain.com-password');
        expect(manager.cache.get('user2@domain.com').value).toBe('user2@domain.com-password');
    });
});