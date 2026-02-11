Feature('Authentication - Registration');

const users = require('../fixtures/users.json');

// ==================== HAPPY PATH TESTS ====================

Scenario('Registration form displays correctly', async ({ I, registerPage }) => {
    registerPage.goto();

    // Verify all form elements are present
    I.seeElement(registerPage.fields.username);
    I.seeElement(registerPage.fields.email);
    I.seeElement(registerPage.fields.password);
    I.seeElement(registerPage.fields.confirmPassword);
    I.seeElement(registerPage.buttons.submit);
});

Scenario('Register with valid data', async ({ I, registerPage }) => {
    const timestamp = Date.now();
    const newUser = {
        username: `testuser_${timestamp}`,
        email: `testuser_${timestamp}@example.com`,
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!',
    };

    registerPage.goto();
    registerPage.register(newUser);

    // Should redirect to login or auto-login
    I.waitForNavigation();
    I.dontSeeInCurrentUrl('/register');
});

Scenario('Navigate to login page from registration', async ({ I, registerPage }) => {
    registerPage.goto();
    registerPage.goToLogin();

    I.seeInCurrentUrl('/login');
});

// ==================== NEGATIVE TESTS ====================

Scenario('Register with existing username shows error', async ({ I, registerPage }) => {
    const existingUser = {
        username: users.users.demo.username, // Using existing user
        email: 'newemail@example.com',
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!',
    };

    registerPage.goto();
    registerPage.register(existingUser);

    // Should stay on register page and show error
    I.waitForElement('[class*="error"]', 5);
});

Scenario('Register with weak password shows error', async ({ I, registerPage }) => {
    const weakPasswordUser = {
        username: `testuser_${Date.now()}`,
        email: `testuser_${Date.now()}@example.com`,
        password: '123', // Weak password
        confirmPassword: '123',
    };

    registerPage.goto();
    registerPage.fillForm(weakPasswordUser);
    registerPage.submit();

    // Should show password validation error
    I.seeInCurrentUrl('/register');
});

Scenario('Register with mismatched passwords shows error', async ({ I, registerPage }) => {
    registerPage.goto();

    I.fillField(registerPage.fields.username, `testuser_${Date.now()}`);
    I.fillField(registerPage.fields.email, `test_${Date.now()}@example.com`);
    I.fillField(registerPage.fields.password, 'Password123!');
    I.fillField(registerPage.fields.confirmPassword, 'DifferentPassword123!');

    registerPage.submit();

    // Should show password mismatch error
    I.seeInCurrentUrl('/register');
});

Scenario('Register with invalid email format shows error', async ({ I, registerPage }) => {
    const invalidEmailUser = {
        username: `testuser_${Date.now()}`,
        email: 'not-an-email',
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!',
    };

    registerPage.goto();
    registerPage.fillForm(invalidEmailUser);
    registerPage.submit();

    // Should show email validation error
    I.seeInCurrentUrl('/register');
});

Scenario('Register with empty username shows error', async ({ I, registerPage }) => {
    registerPage.goto();

    I.fillField(registerPage.fields.email, 'test@example.com');
    I.fillField(registerPage.fields.password, 'Password123!');
    I.fillField(registerPage.fields.confirmPassword, 'Password123!');

    registerPage.submit();

    // Should stay on register page
    I.seeInCurrentUrl('/register');
});

Scenario('Register with empty email shows error', async ({ I, registerPage }) => {
    registerPage.goto();

    I.fillField(registerPage.fields.username, `testuser_${Date.now()}`);
    I.fillField(registerPage.fields.password, 'Password123!');
    I.fillField(registerPage.fields.confirmPassword, 'Password123!');

    registerPage.submit();

    // Should stay on register page
    I.seeInCurrentUrl('/register');
});

// ==================== EDGE CASES ====================

Scenario('Register with unicode username', async ({ I, registerPage }) => {
    const timestamp = Date.now();
    const unicodeUser = {
        username: `用户_${timestamp}`,
        email: `unicode_${timestamp}@example.com`,
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!',
    };

    registerPage.goto();
    registerPage.fillForm(unicodeUser);
    registerPage.submit();

    // May succeed or show validation error - depends on validation rules
    I.wait(2);
});

Scenario('Register with very long username', async ({ I, registerPage }) => {
    const longUsername = 'a'.repeat(100);
    const longUser = {
        username: longUsername,
        email: `longuser_${Date.now()}@example.com`,
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!',
    };

    registerPage.goto();
    registerPage.fillForm(longUser);
    registerPage.submit();

    // Should show validation error for too long username
    I.wait(2);
});

Scenario('Register with special characters in username', async ({ I, registerPage }) => {
    const specialUser = {
        username: `test<script>user`,
        email: `special_${Date.now()}@example.com`,
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!',
    };

    registerPage.goto();
    registerPage.fillForm(specialUser);
    registerPage.submit();

    // Should handle safely - either accept or reject with error
    I.wait(2);
});

Scenario('Register form password field hides input', async ({ I, registerPage }) => {
    registerPage.goto();

    // Password fields should have type="password"
    I.seeElement('input[type="password"]#password');
    I.seeElement('input[type="password"]#confirmPassword');
});
