const CredentialManager = require('./credential-manager');

module.exports = function initCredentialWidget(domElement, browserInterface) {
    'use strict';
    const status = domElement.querySelector('[role=cred-status]');
    const authStatus = domElement.querySelector('[role=auth-status]');
    const loginButton = domElement.querySelector('[role=auth-login]');
    const connectionStatus = domElement.querySelector('[role=connection-status]');
    const connectionStatusText = domElement.querySelector('[role=connection-status-text]');
    const rulesTable = domElement.querySelector('[role=grouping-rules-table] tbody');
    const ruleTemplate = rulesTable ? rulesTable.querySelector('[role=template]') : null;
    const accountsList = domElement.querySelector('[role=accounts-list]');
    const vaultDatalist = domElement.querySelector('#vault-urls');
    const clientIdInput = domElement.querySelector('[data-client-id]');
    const vaultUrlInput = domElement.querySelector('[data-vault-url]');

    // Preloader overlay setup
    let preloader = domElement.querySelector('.preloader-overlay');
    if (!preloader) {
        preloader = document.createElement('div');
        preloader.className = 'preloader-overlay';
        preloader.style.display = 'none';
        preloader.style.position = 'fixed';
        preloader.style.top = 0;
        preloader.style.left = 0;
        preloader.style.width = '100%';
        preloader.style.height = '100%';
        preloader.style.background = 'rgba(255,255,255,0.8)';
        preloader.style.zIndex = 9999;
        preloader.style.justifyContent = 'center';
        preloader.style.alignItems = 'center';
        preloader.style.textAlign = 'center';
        preloader.style.fontSize = '1.5em';
        preloader.innerHTML = '<div class="preloader-message"></div>';
        domElement.appendChild(preloader);
    }
    const preloaderMsg = preloader.querySelector('.preloader-message');

    function showPreloader(msg) {
        preloaderMsg.textContent = msg;
        preloader.style.display = 'flex';
    }
    function hidePreloader(delay = 1000) {
        setTimeout(() => { preloader.style.display = 'none'; }, delay);
    }
    
    // CredentialManager is initialized here, but its client will be properly set in loadOptions
    const credentialManager = new CredentialManager(browserInterface);

    const showStatus = (text, isError) => {
        status.textContent = text;
        status.style.color = isError ? 'red' : 'green';
        setTimeout(() => status.textContent = '', 2000);
    };

    const updateConnectionStatus = (isConnected, message) => {
        connectionStatus.style.color = isConnected ? 'green' : 'red';
        connectionStatusText.textContent = message;
    };

    const updateAuthStatus = async (interactive) => {
        // Show preloader when login is clicked
        showPreloader('Connecting...');
        // Check if the client is initialized before attempting authentication
        if (!credentialManager.client || !credentialManager.client.clientId || !credentialManager.client.vaultUrl) {
            authStatus.textContent = 'Configuration incomplete';
            if (loginButton) loginButton.style.display = 'inline-block';
            updateConnectionStatus(false, 'Please configure Client ID and Vault URL.');
            showPreloader('Connection Failed: Configuration incomplete');
            hidePreloader(2000);
            return;
        }
        try {
            const token = await credentialManager.client.getAuthToken(interactive);
            authStatus.textContent = token ? 'Logged In' : 'Logged Out';
            if (loginButton) loginButton.style.display = token ? 'none' : 'inline-block';
            if (token) {
                updateConnectionStatus(true, 'Authenticated');
                showPreloader('Connection Success! You are connected. Syncing...');
                hidePreloader(1500);
            } else {
                updateConnectionStatus(false, 'Authentication failed or token not received.');
                showPreloader('Connection Failed: No token received');
                hidePreloader(2000);
            }
        } catch (e) {
            authStatus.textContent = 'Logged Out';
            if (loginButton) loginButton.style.display = 'inline-block';
            updateConnectionStatus(false, `Authentication Failed: ${e.message}`);
            showPreloader(`Connection Failed: ${e.message}`);
            hidePreloader(2500);
        }
    };

    const renderRules = (rules = []) => {
        rulesTable.innerHTML = '';
        rules.forEach(rule => {
            const newRow = ruleTemplate.cloneNode(true);
            newRow.querySelector('[role=group-name]').value = rule.name;
            newRow.querySelector('[role=group-pattern]').value = rule.pattern;
            newRow.querySelector('[role=remove-rule]').addEventListener('click', () => {
                newRow.remove();
            });
            rulesTable.appendChild(newRow);
        });
    };

    const renderAccounts = (accounts = []) => {
        accountsList.innerHTML = '';
        accounts.forEach(acc => {
            const li = document.createElement('li');
            li.textContent = acc;
            accountsList.appendChild(li);
        });
    };

    const renderVaultUrls = (urls = []) => {
        vaultDatalist.innerHTML = '';
        urls.forEach(url => {
            const option = document.createElement('option');
            option.value = url;
            vaultDatalist.appendChild(option);
        });
    };

    const restore = async () => {
        // Load options first to get clientId and vaultUrl
        const opts = await browserInterface.getOptionsAsync();
        
        // Update input fields with saved options
        if (clientIdInput) clientIdInput.value = opts.clientId || '';
        if (vaultUrlInput) vaultUrlInput.value = opts.vaultUrl || '';

        // Initialize CredentialManager with loaded options
        const manifestClientId = 'd81f3ba2-ebf7-4d4c-8550-e642c3736d99'; // From manifest.json
        const clientId = opts.clientId || manifestClientId;
        const vaultUrl = opts.vaultUrl;
        // Ensure the client is only created if clientId and vaultUrl are valid
        if (clientId && vaultUrl) {
            credentialManager.client = new (require('./azure-keyvault-client'))(clientId, vaultUrl); // Re-initialize client
        } else {
            credentialManager.client = null; // Ensure client is null if configuration is incomplete
        }

        renderRules(opts.groupingRules);
        renderAccounts(opts.accounts);
        renderVaultUrls(opts.vaultUrls);
        updateAuthStatus(false); // This is called with false, meaning non-interactive check
    };

    const save = async () => {
        const rules = Array.from(rulesTable.querySelectorAll('tr')).map(row => ({
            name: row.querySelector('[role=group-name]').value,
            pattern: row.querySelector('[role=group-pattern]').value
        })).filter(rule => rule.name && rule.pattern);

        const currentOpts = await browserInterface.getOptionsAsync();
        const accounts = currentOpts.accounts; // Keep existing accounts
        const clientId = clientIdInput.value;
        const vaultUrl = vaultUrlInput.value;

        try {
            await browserInterface.saveOptions({
                ...currentOpts, // Preserve other options
                groupingRules: rules,
                accounts: accounts,
                clientId: clientId,
                vaultUrl: vaultUrl
            });
            // Re-initialize the client with new settings after saving
            const manifestClientId = 'd81f3ba2-ebf7-4d4c-8550-e642c3736d99';
            const newClientId = clientId || manifestClientId;
            // Ensure the client is only created if clientId and vaultUrl are valid
            if (newClientId && vaultUrl) {
                credentialManager.client = new (require('./azure-keyvault-client'))(newClientId, vaultUrl); // Re-initialize client
            } else {
                credentialManager.client = null; // Ensure client is null if configuration is incomplete
            }

            await credentialManager.loadOptions(); // This will also re-initialize client, might be redundant but safe.
            showStatus('Settings saved successfully', false);
        } catch (error) {
            showStatus(`Error saving settings: ${error.message}`, true);
            // Optionally, update connection status to reflect save failure
            updateConnectionStatus(false, 'Failed to save settings.');
        }
    };

    const syncAccounts = async () => {
        showStatus('Syncing accounts...', false);
        try {
            // Ensure client is initialized before syncing
            if (!credentialManager.client || !credentialManager.client.clientId || !credentialManager.client.vaultUrl) {
                showStatus('Configuration incomplete. Cannot sync accounts.', true);
                updateConnectionStatus(false, 'Configuration incomplete.');
                return;
            }
            const accounts = await credentialManager.listAndGroupSecrets();
            const currentOpts = await browserInterface.getOptionsAsync();
            // Save the accounts, but keep existing clientId and vaultUrl if they were manually entered
            await browserInterface.saveOptions({
                ...currentOpts,
                accounts: accounts,
                clientId: currentOpts.clientId || 'd81f3ba2-ebf7-4d4c-8550-e642c3736d99', // Ensure these are preserved or re-set if needed
                vaultUrl: currentOpts.vaultUrl
            });
            renderAccounts(Object.values(accounts).flat());
            showStatus('Sync complete!', false);
            updateConnectionStatus(true, 'Connected');
        } catch (e) {
            showStatus(`Error syncing: ${e.message}`, true);
            updateConnectionStatus(false, 'Sync Failed');
        }
    };

    const addRule = () => {
        const newRow = ruleTemplate.cloneNode(true);
        newRow.querySelector('[role=group-name]').value = '';
        newRow.querySelector('[role=group-pattern]').value = '';
        newRow.querySelector('[role=remove-rule]').addEventListener('click', () => newRow.remove());
        rulesTable.appendChild(newRow);
    };

    // Event Listeners (safe add)
    if (loginButton) loginButton.addEventListener('click', () => updateAuthStatus(true));
    const saveBtn = domElement.querySelector('[role=save-credentials]');
    if (saveBtn) saveBtn.addEventListener('click', save);
    const syncBtn = domElement.querySelector('[role=sync-accounts]');
    if (syncBtn) syncBtn.addEventListener('click', syncAccounts);
    const addRuleBtn = domElement.querySelector('[role=add-rule]');
    if (addRuleBtn) addRuleBtn.addEventListener('click', addRule);

    // Initial setup
    if (rulesTable && ruleTemplate) rulesTable.removeChild(ruleTemplate);
    restore(); // Ensure restore is called after all setup
};
