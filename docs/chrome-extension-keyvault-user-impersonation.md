# Azure Key Vault Access from Chrome Extension (User Impersonation)

This document describes how to authenticate a Chrome extension as the signed-in user and access Azure Key Vault using delegated permissions (user impersonation).

## Use Case

**Goal:**
- Allow a Chrome extension to authenticate as the currently signed-in Azure AD user and access Azure Key Vault secrets on their behalf.

**Scenario:**
- The user installs the extension and signs in with their Azure AD (work/school) account.
- The extension requests delegated permissions to Azure Key Vault (`user_impersonation`).
- The extension obtains an access token for the user and uses it to call the Key Vault REST API.

---

## Azure AD App Registration Steps

1. **Register your extension as a Single-page application (SPA):**
   - Go to Azure Portal → Azure Active Directory → App registrations → New registration.
   - Set the platform to "Single-page application".
   - Add a redirect URI: `chrome-extension://<your-extension-id>/` (or a specific page, e.g. `chrome-extension://<your-extension-id>/auth.html`).

2. **API Permissions:**
   - Add delegated permission: `Azure Key Vault` → `user_impersonation`.
   - (Optional) Add Microsoft Graph delegated permissions if needed.

3. **Expose an API (if using custom scopes):**
   - Not required for Key Vault access, but you may add custom scopes for your own API.

---

## Chrome Extension Authentication Flow

1. **Start OAuth Flow:**
   - Use `chrome.identity.launchWebAuthFlow` to open the Azure AD login page.
   - Request the scope: `https://vault.azure.net/.default`.

2. **Receive Access Token:**
   - After user signs in and consents, Azure AD redirects back to your extension with an access token in the URL fragment.

3. **Call Key Vault API:**
   - Use the access token in the `Authorization: Bearer <token>` header for Key Vault REST API calls.

---

## Example Code (background.js or popup.js)

```javascript
const clientId = '<your-client-id>';
const redirectUri = `chrome-extension://${chrome.runtime.id}/`;
const tenant = 'common'; // or your tenant id
const resource = 'https://vault.azure.net';
const authUrl =
  `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize` +
  `?client_id=${clientId}` +
  `&response_type=token` +
  `&redirect_uri=${encodeURIComponent(redirectUri)}` +
  `&scope=${encodeURIComponent(resource + '/.default')}` +
  `&prompt=select_account`;

chrome.identity.launchWebAuthFlow(
  { url: authUrl, interactive: true },
  function (redirectResponse) {
    if (chrome.runtime.lastError) {
      // handle error
      return;
    }
    // Extract access_token from redirectResponse (fragment)
    const match = redirectResponse.match(/access_token=([^&]+)/);
    if (match) {
      const accessToken = match[1];
      // Use accessToken to call Key Vault REST API
      fetch('https://<your-vault-name>.vault.azure.net/secrets/<secret-name>?api-version=7.1', {
        headers: { 'Authorization': 'Bearer ' + accessToken }
      })
      .then(res => res.json())
      .then(data => console.log('Secret value:', data.value));
    }
  }
);
```

---

## Notes
- The user must have access to the Key Vault (via Azure RBAC or access policies).
- The extension never uses a client secret (public client flow).
- You can request additional scopes (e.g., Microsoft Graph) in the same flow if needed.

---

## References
- [Azure AD Chrome Extension Auth](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)
- [Azure Key Vault REST API](https://learn.microsoft.com/en-us/rest/api/keyvault/)
- [chrome.identity API](https://developer.chrome.com/docs/extensions/reference/identity/)
