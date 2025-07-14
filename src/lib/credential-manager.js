const AzureKeyVaultClient = require('./azure-keyvault-client');

module.exports = class CredentialManager {
    constructor(browserInterface) {
        this.browserInterface = browserInterface;
        this.options = {};
        this.client = null;
        this.cache = new Map();
    }

    async loadOptions() {
        this.options = await this.browserInterface.getOptionsAsync() || {};
        const manifestClientId = 'd81f3ba2-ebf7-4d4c-8550-e642c3736d99'; // From manifest.json
        const clientId = this.options.clientId || manifestClientId;
        const vaultUrl = this.options.vaultUrl;
        const clientSecret = this.options.clientSecret || '';
        const tenantId = this.options.tenantId || '';
        const scope = this.options.scope || 'https://vault.azure.net/.default';
        this.client = new AzureKeyVaultClient(clientId, vaultUrl, clientSecret, tenantId, scope);
    }

    fromSecretName(name) {
        return name.replace(/---/g, '_').replace(/--/g, '@').replace(/-/g, '.');
    }

    async getSecret(identifier) {
        await this.loadOptions();
        const now = Date.now();
        if (this.cache.has(identifier) && (now - this.cache.get(identifier).ts < 300000)) {
            return this.cache.get(identifier).value;
        }
        const value = await this.client.getSecret(identifier);
        this.cache.set(identifier, { value, ts: now });
        return value;
    }

    async listAndGroupSecrets() {
        await this.loadOptions();
        const secrets = await this.client.listSecrets();
        const rules = this.options.groupingRules || [];
        const grouped = { 'Ungrouped': [] };
        const now = Date.now();

        const secretPromises = secrets.map(async (secret) => {
            const userId = this.fromSecretName(secret.name);
            const value = await this.client.getSecret(userId);
            this.cache.set(userId, { value, ts: now });

            let isGrouped = false;
            rules.forEach(rule => {
                if (new RegExp(rule.pattern).test(userId)) {
                    if (!grouped[rule.name]) {
                        grouped[rule.name] = [];
                    }
                    grouped[rule.name].push(userId);
                    isGrouped = true;
                }
            });
            if (!isGrouped) {
                grouped.Ungrouped.push(userId);
            }
        });

        await Promise.all(secretPromises);
        return grouped;
    }

    async fillCredentials(tabId, accountId) {
        const password = await this.getSecret(accountId);
        await this.browserInterface.executeScript(tabId, '/credential-fill.js');
        await this.browserInterface.sendMessage(tabId, { username: accountId, password: password });
    }

    async updatePassword(accountId, newPassword) {
        await this.loadOptions();
        await this.client.setSecret(accountId, newPassword);
        this.cache.delete(accountId);
    }
};
