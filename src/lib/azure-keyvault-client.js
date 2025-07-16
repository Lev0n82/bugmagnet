module.exports = class AzureKeyVaultClient {
    constructor(clientId, vaultUrl, clientSecret, tenantId, scope) {
        this.apiVersion = '7.1';
        this.vaultUrl = vaultUrl;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.tenantId = tenantId;
        this.scope = scope || 'https://vault.azure.net/.default';
        this.accessToken = null;
    }

    async getAuthToken() {
        if (this.accessToken) {
            return this.accessToken;
        }
        if (!this.clientId || !this.clientSecret || !this.tenantId) {
            throw new Error('Azure Key Vault client credentials are not fully configured. Please set Client ID, Client Secret, and Tenant ID.');
        }
        // Client Credentials Flow
        const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
        const params = new URLSearchParams({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            scope: this.scope.endsWith('/.default') ? this.scope : this.scope + '/.default',
            grant_type: 'client_credentials'
        });
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });
        const data = await response.json();
        if (!data.access_token) {
            throw new Error('Failed to get access token: ' + JSON.stringify(data));
        }
        this.accessToken = data.access_token;
        return this.accessToken;
    }

    toSecretName(identifier) {
        return identifier.replace(/_/g, '---')
            .replace(/@/g, '--')
            .replace(/\./g, '-');
    }

    async getSecret(identifier) {
        const name = this.toSecretName(identifier);
        const url = `${this.vaultUrl}/secrets/${name}?api-version=${this.apiVersion}`;
        const authToken = await this.getAuthToken();

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Error fetching secret: ${error.error.message}`);
        }

        const data = await response.json();
        return data.value;
    }

    async setSecret(identifier, value) {
        const name = this.toSecretName(identifier);
        const url = `${this.vaultUrl}/secrets/${name}?api-version=${this.apiVersion}`;
        const authToken = await this.getAuthToken();

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ value: value })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Error setting secret: ${error.error.message}`);
        }
    }

    async listSecrets() {
        let results = [];
        let url = `${this.vaultUrl}/secrets?api-version=${this.apiVersion}`;
        const authToken = await this.getAuthToken();

        while (url) {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Error listing secrets: ${error.error.message}`);
            }

            const data = await response.json();
            results = results.concat(data.value);
            url = data.nextLink;
        }
        return results;
    }
};
