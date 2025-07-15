// Playwright test for Bug Magnet extension with real browser interaction
// Prerequisites:
// 1. Install Playwright: npm install --save-dev @playwright/test
// 2. Build your extension and note the path to the unpacked extension directory (e.g., ./pack)
// 3. Set up a test page (e.g., pack/testpage.html) for UI interaction

const { test, expect } = require('@playwright/test');
const path = require('path');

// Path to the unpacked extension directory
const EXTENSION_PATH = path.join(__dirname, '../pack');
const TEST_PAGE = 'file://' + path.join(__dirname, '../pack/testpage.html');

// Helper to launch Chromium with the extension loaded
async function launchWithExtension(playwright) {
  const context = await playwright.chromium.launchPersistentContext('', {
    headless: false, // Set to true for CI, but false for interactive auth
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`
    ]
  });
  return context;
}

test.describe('Bug Magnet Extension (Playwright)', () => {
  test('should load extension, authenticate, and retrieve secret', async ({ playwright }) => {
    const context = await launchWithExtension(playwright);
    const page = await context.newPage();
    await page.goto(TEST_PAGE);

    // Open the extension popup (simulate user clicking the extension icon)
    // Playwright cannot click the browser toolbar, but you can open the options page directly:
    const [optionsPage] = await Promise.all([
      context.waitForEvent('page'),
      page.evaluate(() => {
        chrome.runtime.openOptionsPage();
      })
    ]);
    await optionsPage.waitForLoadState();
    await expect(optionsPage).toHaveTitle(/Bug Magnet|bug_magnet/i);

    // Interact with the options page: trigger authentication, sync, etc.
    // Example: Click the login button if present
    const loginBtn = await optionsPage.$('[role="auth-login"]');
    if (loginBtn) {
      await loginBtn.click();
      // Wait for login to complete (may require manual interaction)
      await optionsPage.waitForTimeout(10000); // Adjust as needed
    }

    // Trigger sync and check for secret/account
    const syncBtn = await optionsPage.$('[role="sync-accounts"]');
    if (syncBtn) {
      await syncBtn.click();
      await optionsPage.waitForTimeout(5000);
    }

    // Optionally, check for a known account/secret in the UI
    const accountRow = await optionsPage.$('text=uft@ontario.ca');
    expect(accountRow).not.toBeNull();

    // Open DevTools panel (advanced, requires Chrome DevTools Protocol)
    // See Playwright docs for CDP usage if you want to automate DevTools panel

    await context.close();
  });
});
