const CredentialManager = require('./credential-manager');

module.exports = class CredentialContextMenu {
    constructor(browserInterface) {
        this.browserInterface = browserInterface;
        this.credentialManager = new CredentialManager(browserInterface);
        this.rootId = null;
        this.menuIds = [];
    }

    async buildMenu() {
        if (typeof this.browserInterface.removeAllContextMenus === 'function') {
            await this.browserInterface.removeAllContextMenus();
        } else {
            if (this.rootId) await this.browserInterface.removeContextMenu(this.rootId);
            await Promise.all(this.menuIds.map(id => this.browserInterface.removeContextMenu(id)));
            this.menuIds = [];
            this.rootId = null;
        }

        const opts = await this.browserInterface.getOptionsAsync();
        const accounts = opts && opts.accounts;
        const debugLogging = opts && opts.debugLogging;

        if (debugLogging) console.log('[BugMagnet] Loaded accounts for credential menu:', accounts);

        if (!accounts || Object.keys(accounts).length === 0) {
            if (debugLogging) console.log('[BugMagnet] No test accounts found in config.');
            return;
        }

        this.rootId = this.browserInterface.createContextMenu({
            title: 'Test Accounts',
            id: 'test-accounts-root',
            contexts: ['editable']
        });
        this.menuIds.push(this.rootId);

        let accountCounter = 0;
        for (const groupName in accounts) {
            const groupAccounts = accounts[groupName];
            if (groupAccounts.length === 0) continue;

            const parentId = (groupName === 'Ungrouped') ? this.rootId : this.browserInterface.createContextMenu({
                title: groupName,
                parentId: this.rootId,
                id: `group-${groupName.replace(/\s/g, '-')}`,
                contexts: ['editable']
            });
            if (groupName !== 'Ungrouped') this.menuIds.push(parentId);

            groupAccounts.forEach(accountId => {
                const id = this.browserInterface.createContextMenu({
                    title: accountId,
                    parentId: parentId,
                    id: `test-account-${accountCounter++}`,
                    contexts: ['editable'],
                    onclick: (info, tab) => this.credentialManager.fillCredentials(tab.id, accountId)
                });
                this.menuIds.push(id);
                if (debugLogging) console.log(`[BugMagnet] Created test account menu: ${accountId} in ${groupName}`);
            });
        }
    }

    init() {
        this.buildMenu();
        this.browserInterface.addStorageListener(() => this.buildMenu());
    }
};
