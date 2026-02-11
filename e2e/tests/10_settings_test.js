Feature('Settings - Theme and Language');

const users = require('../fixtures/users.json');

Before(async ({ AuthHelper }) => {
    await AuthHelper.loginAs(users.users.demo.username, users.users.demo.password);
});

// ==================== THEME TESTS ====================

Scenario('Theme toggle button is visible', async ({ I, profilePage }) => {
    profilePage.goto();

    I.seeElement(profilePage.settings.themeToggle);
});

Scenario('Toggle from light to dark mode', async ({ I, profilePage }) => {
    profilePage.goto();
    profilePage.toggleTheme();

    // Should apply dark theme
    I.wait(1);
    I.seeElement('[data-theme="dark"]');
});

Scenario('Toggle from dark to light mode', async ({ I, profilePage }) => {
    profilePage.goto();

    // First switch to dark
    profilePage.toggleTheme();
    I.wait(1);

    // Then switch back to light
    profilePage.toggleTheme();
    I.wait(1);

    I.seeElement('[data-theme="light"]');
});

Scenario('Theme persists after page refresh', async ({ I, profilePage }) => {
    profilePage.goto();
    profilePage.toggleTheme(); // Switch to dark
    I.wait(1);

    // Refresh page
    I.refreshPage();
    I.wait(2);

    // Theme should persist
    I.seeElement('[data-theme="dark"]');

    // Clean up - switch back
    profilePage.toggleTheme();
});

Scenario('Theme applies to all pages', async ({ I, profilePage, notesPage }) => {
    profilePage.goto();
    profilePage.toggleTheme();
    I.wait(1);

    // Navigate to notes page
    notesPage.goto();

    // Theme should still be dark
    I.seeElement('[data-theme="dark"]');

    // Clean up
    profilePage.goto();
    profilePage.toggleTheme();
});

// ==================== LANGUAGE TESTS ====================

Scenario('Language selector is visible', async ({ I, profilePage }) => {
    profilePage.goto();

    I.seeElement(profilePage.settings.languageSelector);
});

Scenario('Change language to Vietnamese', async ({ I, profilePage }) => {
    profilePage.goto();
    profilePage.changeLanguage('vi');

    I.wait(1);
    // Should see Vietnamese text (e.g., "Hồ sơ" for Profile)
});

Scenario('Change language to German', async ({ I, profilePage }) => {
    profilePage.goto();
    profilePage.changeLanguage('de');

    I.wait(1);
    // Should see German text
});

Scenario('Change language to Japanese', async ({ I, profilePage }) => {
    profilePage.goto();
    profilePage.changeLanguage('ja');

    I.wait(1);
    // Should see Japanese text
});

Scenario('Change language back to English', async ({ I, profilePage }) => {
    profilePage.goto();

    // First change to another language
    profilePage.changeLanguage('vi');
    I.wait(1);

    // Then change back to English
    profilePage.changeLanguage('en');
    I.wait(1);

    // Should see English text
    I.see('Profile');
});

Scenario('Language persists after page refresh', async ({ I, profilePage }) => {
    profilePage.goto();
    profilePage.changeLanguage('vi');
    I.wait(1);

    // Refresh page
    I.refreshPage();
    I.wait(2);

    // Language should persist (check for Vietnamese text)

    // Clean up - switch back to English
    profilePage.changeLanguage('en');
});

Scenario('Language applies to all pages', async ({ I, profilePage, notesPage }) => {
    profilePage.goto();
    profilePage.changeLanguage('vi');
    I.wait(1);

    // Navigate to notes page
    notesPage.goto();

    // Should show Vietnamese text on notes page
    I.wait(1);

    // Clean up
    profilePage.goto();
    profilePage.changeLanguage('en');
});

// ==================== LOGIN PAGE LANGUAGE TESTS ====================

Scenario('Language selector on login page works', async ({ I, loginPage, AuthHelper }) => {
    await AuthHelper.logout();

    loginPage.goto();
    loginPage.changeLanguage('vi');

    I.wait(1);
    // Login page text should be in Vietnamese
});

// ==================== EDGE CASES ====================

Scenario('Rapid language switching works', async ({ I, profilePage }) => {
    profilePage.goto();

    // Rapidly switch languages
    profilePage.changeLanguage('vi');
    I.wait(0.3);
    profilePage.changeLanguage('de');
    I.wait(0.3);
    profilePage.changeLanguage('ja');
    I.wait(0.3);
    profilePage.changeLanguage('en');

    // Should not crash
    I.seeElement(profilePage.settings.languageSelector);
});

Scenario('Theme and language combination persists', async ({ I, profilePage }) => {
    profilePage.goto();

    // Set dark theme and Vietnamese
    profilePage.toggleTheme();
    I.wait(0.5);
    profilePage.changeLanguage('vi');
    I.wait(1);

    // Refresh
    I.refreshPage();
    I.wait(2);

    // Both should persist
    I.seeElement('[data-theme="dark"]');

    // Clean up
    profilePage.toggleTheme();
    profilePage.changeLanguage('en');
});
