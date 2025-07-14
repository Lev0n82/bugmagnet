require('./setup-jsdom');

describe('Options UI - Azure Key Vault User Guidance', function() {
  let optionsHtml;
  beforeAll(function(done) {
    const fs = require('fs');
    const path = require('path');
    const htmlPath = path.resolve(__dirname, '../template/options.html');
    fs.readFile(htmlPath, 'utf8', function(err, data) {
      if (err) throw err;
      optionsHtml = data;
      done();
    });
  });

  it('should display user guidance for Azure Key Vault authentication', function() {
    document.body.innerHTML = optionsHtml;
    const helpBox = document.querySelector('#credentials div');
    expect(helpBox).not.toBeNull();
    expect(helpBox.innerHTML).toContain('How to connect to Azure Key Vault as the signed-in user');
    expect(helpBox.innerHTML).toContain('Enter your <b>Azure App Registration Client ID</b>');
    expect(helpBox.innerHTML).toContain('Click <b>Login</b> to sign in');
    expect(helpBox.innerHTML).toContain('See <a href="docs/chrome-extension-keyvault-user-impersonation.md"');
  });

  it('should have a Login button and authentication status', function() {
    document.body.innerHTML = optionsHtml;
    const loginBtn = document.querySelector('#credentials [data-auth-login]');
    const authStatus = document.querySelector('#credentials [data-auth-status]');
    expect(loginBtn).not.toBeNull();
    expect(authStatus).not.toBeNull();
    expect(loginBtn.textContent).toMatch(/login/i);
    expect(authStatus.textContent).toMatch(/unknown/i);
  });
});
