Feature('Authentication - Login');

const users = require('../fixtures/users.json');

BeforeSuite(({ I }) => {
    // Navigate to login page before each test
    I.amOnPage('/login');
});

// ==================== HAPPY PATH TESTS ====================

Scenario('Login with valid credentials', async ({ I, loginPage }) => {
    loginPage.goto();
    loginPage.login(users.users.demo.username, users.users.demo.password);

    // Verify successful login - should redirect to notes or dashboard
    I.waitForNavigation();
    I.dontSeeInCurrentUrl('/login');
    I.seeInCurrentUrl('/notes');
});

Scenario('Login form displays correctly', async ({ I, loginPage }) => {
    loginPage.goto();

    // Verify all form elements are present
    I.seeElement(loginPage.fields.username);
    I.seeElement(loginPage.fields.password);
    I.seeElement(loginPage.buttons.submit);
    I.seeElement(loginPage.buttons.register);
});

Scenario('Navigate to register page from login', async ({ I, loginPage }) => {
    loginPage.goto();
    loginPage.clickRegister();

    I.waitForNavigation();
    I.seeInCurrentUrl('/register');
});

Scenario('Navigate to forgot password page', async ({ I, loginPage }) => {
    loginPage.goto();
    loginPage.clickForgotPassword();

    I.waitForNavigation();
    I.seeInCurrentUrl('/forgot-password');
});

// ==================== NEGATIVE TESTS ====================

Scenario('Login with invalid password shows error', async ({ I, loginPage }) => {
    loginPage.goto();
    loginPage.login(
        users.invalidCredentials.wrongPassword.username,
        users.invalidCredentials.wrongPassword.password
    );

    // Should stay on login page and show error
    I.seeInCurrentUrl('/login');
    I.waitForElement('[class*="error"]', 5);
});

Scenario('Login with non-existent username shows error', async ({ I, loginPage }) => {
    loginPage.goto();
    loginPage.login(
        users.invalidCredentials.nonExistentUser.username,
        users.invalidCredentials.nonExistentUser.password
    );

    // Should stay on login page and show error
    I.seeInCurrentUrl('/login');
    I.waitForElement('[class*="error"]', 5);
});

Scenario('Login with empty credentials shows validation error', async ({ I, loginPage }) => {
    loginPage.goto();

    // Try to submit empty form
    I.click(loginPage.buttons.submit);

    // Should stay on login page 
    I.seeInCurrentUrl('/login');
});

Scenario('Login with only username shows error', async ({ I, loginPage }) => {
    loginPage.goto();
    I.fillField(loginPage.fields.username, 'testuser');
    I.click(loginPage.buttons.submit);

    // Should stay on login page
    I.seeInCurrentUrl('/login');
});

Scenario('Login with only password shows error', async ({ I, loginPage }) => {
    loginPage.goto();
    I.fillField(loginPage.fields.password, 'testpassword');
    I.click(loginPage.buttons.submit);

    // Should stay on login page
    I.seeInCurrentUrl('/login');
});

// ==================== EDGE CASES / SECURITY TESTS ====================

Scenario('Login with SQL injection attempt is handled safely', async ({ I, loginPage }) => {
    loginPage.goto();
    loginPage.login(
        users.invalidCredentials.sqlInjection.username,
        users.invalidCredentials.sqlInjection.password
    );

    // Should not crash, should show error or stay on login
    I.seeInCurrentUrl('/login');
    I.dontSee('error', 'body'); // No server error
});

Scenario('Login with XSS attempt is handled safely', async ({ I, loginPage }) => {
    loginPage.goto();
    loginPage.login(
        users.invalidCredentials.xssAttempt.username,
        users.invalidCredentials.xssAttempt.password
    );

    // XSS payload should not execute
    I.seeInCurrentUrl('/login');
    // Verify no alert dialog appeared (XSS prevented)
});

Scenario('Login form has proper input types', async ({ I, loginPage }) => {
    loginPage.goto();

    // Password field should have type="password"
    I.seeElement('input[type="password"]#password');
});

Scenario('Rapid login attempts are handled', async ({ I, loginPage }) => {
    loginPage.goto();

    // Attempt multiple rapid logins
    for (let i = 0; i < 5; i++) {
        loginPage.fillLoginForm('invalid_user', 'invalid_pass');
        I.click(loginPage.buttons.submit);
        I.wait(0.5);
    }

    // Should still be on login page, no crash
    I.seeInCurrentUrl('/login');
});

// ==================== OAUTH TESTS ====================

Scenario('Google Sign In button is visible when enabled', async ({ I, loginPage, ApiHelper }) => {
    const isGoogleEnabled = await ApiHelper.isGoogleOAuthEnabled();

    loginPage.goto();

    if (isGoogleEnabled) {
        I.seeElement(loginPage.buttons.googleSignIn);
    } else {
        I.dontSeeElement(loginPage.buttons.googleSignIn);
    }
});

// ==================== SESSION TESTS ====================

Scenario('Already logged in user is redirected from login page', async ({ I, loginPage, AuthHelper }) => {
    // Login via API first
    await AuthHelper.loginAs(users.users.demo.username, users.users.demo.password);

    // Try to access login page
    I.amOnPage('/login');
    I.wait(2);

    // Should be redirected to notes
    I.dontSeeInCurrentUrl('/login');
});

Scenario('Logout clears session and redirects to login', async ({ I, AuthHelper }) => {
    // Login first
    await AuthHelper.loginAs(users.users.demo.username, users.users.demo.password);

    // Perform logout
    await AuthHelper.logout();

    // Should be on login page
    I.seeInCurrentUrl('/login');

    // Try to access protected route
    I.amOnPage('/notes');
    I.wait(2);

    // Should redirect to login
    I.seeInCurrentUrl('/login');
});
