require('./setup-jsdom');
/*global describe, it, expect, beforeEach, afterEach, jasmine, spyOn, window, fail */
const AzureKeyVaultClient = require('../src/lib/azure-keyvault-client');
const FakeChromeApi = require('./utils/fake-chrome-api');

describe('AzureKeyVaultClient', () => {
    'use strict';
    let client, fakeChrome, originalChrome;

    let originalFetch;
    beforeEach(() => {
        // Mock chrome API
        fakeChrome = new FakeChromeApi();
        originalChrome = global.chrome;
        global.chrome = fakeChrome;
        // Use testVaultConfig for vaultUrl and clientId
        const vaultUrl = global.testVaultConfig.vaultUrl || 'https://example.vault.azure.net';
        const clientId = global.testVaultConfig.clientId || 'test-client-id';
        client = new AzureKeyVaultClient(clientId, vaultUrl);
        spyOn(client, 'getAuthToken').and.returnValue(Promise.resolve('fake-token'));
        // Restore fetch if already spied
        if (window.fetch && window.fetch.and && window.fetch.and.originalFn) {
            window.fetch = window.fetch.and.originalFn;
        }
        originalFetch = window.fetch;
        spyOn(window, 'fetch').and.callFake((url, opts) => {
            if (url.includes('secrets/test--example-com')) {
                if (opts && opts.method === 'PUT') {
                    // setSecret
                    if (opts.body && opts.body.includes('fail')) {
                        return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: { message: 'Invalid value' } }) });
                    }
                    return Promise.resolve({ ok: true });
                } else {
                    // getSecret
                    if (url.includes('notfound')) {
                        return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: { message: 'Not Found' } }) });
                    }
                    return Promise.resolve({ ok: true, json: () => Promise.resolve({ value: 'secret' }) });
                }
            } else if (url.includes('secrets?api-version=7.1')) {
                // listSecrets
                if (url.includes('page=2')) {
                    return Promise.resolve({ ok: true, json: () => Promise.resolve({ value: [{ id: 'secret2' }] }) });
                }
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ value: [{ id: 'secret1' }], nextLink: 'https://example.vault.azure.net/secrets?api-version=7.1&page=2' }) });
            }
            // Default: fail
            return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: { message: 'Forbidden' } }) });
        });
    });

    afterEach(() => {
        global.chrome = originalChrome;
        if (window.fetch && window.fetch.and && window.fetch.and.originalFn) {
            window.fetch = originalFetch;
        }
    });

    it('converts account identifier to secret name', () => {
        expect(client.toSecretName('user_example@test.email.com')).toBe('user---example--test-email-com');
    });

    describe('getSecret', () => {
        it('retrieves a secret value', async () => {
            spyOn(window, 'fetch').and.returnValue(Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ value: 'secret' })
            }));

            await client.getSecret('test@example.com');

            expect(client.getAuthToken).toHaveBeenCalled();
            expect(window.fetch).toHaveBeenCalledWith('https://example.vault.azure.net/secrets/test--example-com?api-version=7.1', jasmine.any(Object));

            expect(secrets.length).toBe(2);
        });

        it('handles paginated results', async () => {
            const fetchSpy = spyOn(window, 'fetch').and.callFake(url => {
                if (url.includes('page=2')) {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ value: [{ id: 'secret2' }] })
                    });
                }
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ value: [{ id: 'secret1' }], nextLink: 'https://example.vault.azure.net/secrets?api-version=7.1&page=2' })
                });
            });

            const secrets = await client.listSecrets();

            expect(secrets.length).toBe(2);
            expect(fetchSpy).toHaveBeenCalledTimes(2);
        });

        it('throws an error if the network request fails', async () => {
            spyOn(window, 'fetch').and.returnValue(Promise.resolve({
                ok: false,
                json: () => Promise.resolve({ error: { message: 'Forbidden' } })
            }));
            try {
                await client.listSecrets();
                fail('Expected listSecrets to throw, but it did not');
            } catch (e) {
                expect(e.message).toBe('Error listing secrets: Forbidden');
            }
        });
    });
});
