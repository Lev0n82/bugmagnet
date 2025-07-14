require('./setup-jsdom');
const CredentialContextMenu = require('../src/lib/credential-context-menu');

describe('CredentialContextMenu', () => {
    let credentialContextMenu, mockBrowserInterface, mockCredentialManager;

    beforeEach(() => {
        mockBrowserInterface = {
            getOptionsAsync: jasmine.createSpy('getOptionsAsync').and.returnValue(Promise.resolve({})),
            createContextMenu: jasmine.createSpy('createContextMenu').and.callFake(options => options.id || `menu-item-${Math.random()}`),
            removeAllContextMenus: jasmine.createSpy('removeAllContextMenus').and.returnValue(Promise.resolve()),
            removeContextMenu: jasmine.createSpy('removeContextMenu').and.returnValue(Promise.resolve()),
            addStorageListener: jasmine.createSpy('addStorageListener')
        };

        mockCredentialManager = {
            fillCredentials: jasmine.createSpy('fillCredentials')
        };

        credentialContextMenu = new CredentialContextMenu(mockBrowserInterface);
        credentialContextMenu.credentialManager = mockCredentialManager;
    });

    describe('buildMenu', () => {
        it('should do nothing if accounts are missing from options', async () => {
            mockBrowserInterface.getOptionsAsync.and.returnValue(Promise.resolve({}));
            await credentialContextMenu.buildMenu();
            expect(mockBrowserInterface.createContextMenu).not.toHaveBeenCalled();
        });

        it('should do nothing if accounts object is empty', async () => {
            mockBrowserInterface.getOptionsAsync.and.returnValue(Promise.resolve({ accounts: {} }));
            await credentialContextMenu.buildMenu();
            expect(mockBrowserInterface.createContextMenu).not.toHaveBeenCalled();
        });

        it('should create a root "Test Accounts" menu', async () => {
            const accounts = { 'Ungrouped': ['account1'] };
            mockBrowserInterface.getOptionsAsync.and.returnValue(Promise.resolve({ accounts }));

            await credentialContextMenu.buildMenu();

            expect(mockBrowserInterface.createContextMenu).toHaveBeenCalledWith(jasmine.objectContaining({
                title: 'Test Accounts',
                id: 'test-accounts-root',
                contexts: ['editable']
            }));
        });

        it('should create a distinct submenu for each group', async () => {
            const accounts = {
                'Group 1': ['account1'],
                'Group 2': ['account2'],
                'Ungrouped': ['account3']
            };
            mockBrowserInterface.getOptionsAsync.and.returnValue(Promise.resolve({ accounts }));

            await credentialContextMenu.buildMenu();

            expect(mockBrowserInterface.createContextMenu).toHaveBeenCalledWith(jasmine.objectContaining({
                title: 'Group 1',
                parentId: 'test-accounts-root',
                id: 'group-Group-1'
            }));
            expect(mockBrowserInterface.createContextMenu).toHaveBeenCalledWith(jasmine.objectContaining({
                title: 'Group 2',
                parentId: 'test-accounts-root',
                id: 'group-Group-2'
            }));
            expect(mockBrowserInterface.createContextMenu).not.toHaveBeenCalledWith(jasmine.objectContaining({
                title: 'Ungrouped'
            }));
        });

        it('should create individual menu items for each account under the correct group', async () => {
            const accounts = {
                'Group 1': ['account1', 'account2'],
                'Ungrouped': ['account3']
            };
            mockBrowserInterface.getOptionsAsync.and.returnValue(Promise.resolve({ accounts }));
            mockBrowserInterface.createContextMenu
                .withArgs(jasmine.objectContaining({ title: 'Group 1' })).and.returnValue('group-1-id');

            await credentialContextMenu.buildMenu();

            expect(mockBrowserInterface.createContextMenu).toHaveBeenCalledWith(jasmine.objectContaining({
                title: 'account1',
                parentId: 'group-1-id'
            }));
            expect(mockBrowserInterface.createContextMenu).toHaveBeenCalledWith(jasmine.objectContaining({
                title: 'account2',
                parentId: 'group-1-id'
            }));
        });

        it('should create ungrouped accounts directly under the root menu', async () => {
            const accounts = {
                'Ungrouped': ['account1']
            };
            mockBrowserInterface.getOptionsAsync.and.returnValue(Promise.resolve({ accounts }));

            await credentialContextMenu.buildMenu();

            expect(mockBrowserInterface.createContextMenu).toHaveBeenCalledWith(jasmine.objectContaining({
                title: 'account1',
                parentId: 'test-accounts-root'
            }));
        });

        it('should call fillCredentials when an account menu item is clicked', async () => {
            const accounts = {
                'Ungrouped': ['account1']
            };
            mockBrowserInterface.getOptionsAsync.and.returnValue(Promise.resolve({ accounts }));

            await credentialContextMenu.buildMenu();

            const onClickCallback = mockBrowserInterface.createContextMenu.calls.all().find(c => c.args[0].title === 'account1').args[0].onclick;
            
            const tab = { id: 123 };
            onClickCallback({}, tab);

            expect(mockCredentialManager.fillCredentials).toHaveBeenCalledWith(123, 'account1');
        });
    });
});