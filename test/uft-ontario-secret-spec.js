

require('./setup-jsdom');
const AzureKeyVaultClient = require('../src/lib/azure-keyvault-client');
const FakeChromeApi = require('./utils/fake-chrome-api');

describe('Azure Key Vault: uft@ontario.ca secret retrieval', () => {
  let client, originalChrome;
  beforeAll(() => {
    // Mock chrome API with identity stubs
    originalChrome = global.chrome;
    const fakeChrome = new FakeChromeApi();
    fakeChrome.identity = {
      getRedirectURL: () => 'http://localhost/fake-redirect',
      launchWebAuthFlow: (opts, cb) => cb('http://localhost/fake-redirect#access_token=fake-token')
    };
    global.chrome = fakeChrome;
    // Use testVaultConfig for vaultUrl and clientId
    const vaultUrl = global.testVaultConfig.vaultUrl || 'https://qa-dev-sc.vault.azure.net/';
    const clientId = global.testVaultConfig.clientId || 'test-client-id';
    client = new AzureKeyVaultClient(clientId, vaultUrl);
  });
  afterAll(() => {
    global.chrome = originalChrome;
  });

  it('should retrieve the password for uft@ontario.ca from the vault', async (done) => {
    try {
      // The secret name should match the convention used in your extension
      const secretName = 'uft--ontario-ca';
      const password = await client.getSecret(secretName);
      expect(password).toBeDefined();
      expect(typeof password).toBe('string');
      expect(password.length).toBeGreaterThan(0);
      // Optionally, log the password (not recommended in CI)
      // console.log('Retrieved password:', password);
      done();
    } catch (err) {
      fail('Failed to retrieve password: ' + err.message);
      done();
    }
  });
});
