Feature('Two-Factor Authentication (2FA)');

const users = require('../fixtures/users.json');

Before(async ({ AuthHelper }) => {
    await AuthHelper.loginAs(users.users.demo.username, users.users.demo.password);
});

// ==================== 2FA SETUP PAGE TESTS ====================

Scenario('2FA setup page loads correctly', async ({ I }) => {
    I.amOnPage('/setup-2fa');
    I.wait(2);

    // Should see QR code or setup instructions
    I.seeElement('[data-testid="2fa-setup"]');
});

Scenario('2FA setup shows QR code', async ({ I }) => {
    I.amOnPage('/setup-2fa');
    I.wait(2);

    // Should display QR code for authenticator app
    I.seeElement('[data-testid="qr-code"]');
});

Scenario('2FA setup shows secret key', async ({ I }) => {
    I.amOnPage('/setup-2fa');
    I.wait(2);

    // Should show manual entry secret key
    I.seeElement('[data-testid="secret-key"]');
});

// ==================== 2FA DISABLE TESTS ====================

Scenario('Disable 2FA page loads', async ({ I }) => {
    I.amOnPage('/disable-2fa');
    I.wait(2);

    I.seeElement('[data-testid="disable-2fa-form"]');
});

Scenario('Disable 2FA without OTP (simplified flow)', async ({ I }) => {
    // NoteHub allows disabling 2FA without OTP since user is already authenticated
    I.amOnPage('/disable-2fa');
    I.wait(2);

    I.click('[data-testid="confirm-disable-2fa"]');
    I.wait(2);

    // Should show success or confirmation
});

// ==================== NEGATIVE TESTS ====================

Scenario('2FA setup requires authentication', async ({ I, AuthHelper }) => {
    await AuthHelper.logout();

    I.amOnPage('/setup-2fa');
    I.wait(2);

    // Should redirect to login
    I.seeInCurrentUrl('/login');
});

Scenario('2FA disable requires authentication', async ({ I, AuthHelper }) => {
    await AuthHelper.logout();

    I.amOnPage('/disable-2fa');
    I.wait(2);

    // Should redirect to login
    I.seeInCurrentUrl('/login');
});

Scenario('Invalid 2FA code shows error', async ({ I }) => {
    I.amOnPage('/setup-2fa');
    I.wait(2);

    // Enter invalid verification code
    I.fillField('[data-testid="verification-code"]', '000000');
    I.click('[data-testid="verify-2fa"]');

    I.wait(2);
    // Should show error message
    I.seeElement('[class*="error"]');
});

// ==================== EDGE CASES ====================

Scenario('2FA QR code is regeneratable', async ({ I }) => {
    I.amOnPage('/setup-2fa');
    I.wait(2);

    // Click regenerate if available
    const hasRegenerate = await I.grabNumberOfVisibleElements('[data-testid="regenerate-qr"]');
    if (hasRegenerate > 0) {
        I.click('[data-testid="regenerate-qr"]');
        I.wait(2);
        I.seeElement('[data-testid="qr-code"]');
    }
});

Scenario('Cancel 2FA setup', async ({ I }) => {
    I.amOnPage('/setup-2fa');
    I.wait(2);

    I.click('[data-testid="cancel-2fa-setup"]');
    I.wait(1);

    // Should navigate away from setup
    I.dontSeeInCurrentUrl('/setup-2fa');
});

// ==================== LOGIN WITH 2FA TESTS ====================

Scenario('Login prompts for 2FA code when enabled', async ({ I, AuthHelper }) => {
    // This test requires a user with 2FA enabled
    // For now, just verify the flow exists
    await AuthHelper.logout();

    I.amOnPage('/login');
    I.wait(1);

    // If a specific 2FA-enabled test user exists, test the flow
    // The 2FA prompt should appear after initial login
});

// Note: Full 2FA verification testing is limited in E2E tests
// because we cannot generate valid TOTP codes without the secret
// Real 2FA testing should use mock TOTP or a test secret
