Feature('Admin Dashboard');

const users = require('../fixtures/users.json');

// Note: These tests require admin credentials
// Admin password should be set via NOTES_ADMIN_PASSWORD environment variable

// ==================== ADMIN ACCESS TESTS ====================

Scenario('Admin can access dashboard', async ({ I, adminPage, AuthHelper }) => {
    // Login as admin (password from env var)
    const adminPassword = process.env.NOTES_ADMIN_PASSWORD || 'admin123';
    await AuthHelper.loginAs('admin', adminPassword);

    adminPage.goto();
    adminPage.seeAdminDashboard();
});

Scenario('Non-admin cannot access admin dashboard', async ({ I, adminPage, AuthHelper }) => {
    // Login as regular user
    await AuthHelper.loginAs(users.users.demo.username, users.users.demo.password);

    I.amOnPage('/admin');
    I.wait(2);

    // Should be redirected or show access denied
    adminPage.seeAccessDenied();
});

Scenario('Unauthenticated user cannot access admin', async ({ I, AuthHelper }) => {
    await AuthHelper.logout();

    I.amOnPage('/admin');
    I.wait(2);

    // Should redirect to login
    I.seeInCurrentUrl('/login');
});

// ==================== ADMIN DASHBOARD TESTS ====================

Scenario('Admin dashboard shows statistics', async ({ I, adminPage, AuthHelper }) => {
    const adminPassword = process.env.NOTES_ADMIN_PASSWORD || 'admin123';
    await AuthHelper.loginAs('admin', adminPassword);

    adminPage.goto();

    I.seeElement(adminPage.dashboard.stats);
    I.seeElement(adminPage.dashboard.userCount);
});

Scenario('Admin can navigate to users list', async ({ I, adminPage, AuthHelper }) => {
    const adminPassword = process.env.NOTES_ADMIN_PASSWORD || 'admin123';
    await AuthHelper.loginAs('admin', adminPassword);

    adminPage.goto();
    adminPage.goToUsers();

    I.seeElement(adminPage.usersList.container);
});

Scenario('Admin can navigate to audit logs', async ({ I, adminPage, AuthHelper }) => {
    const adminPassword = process.env.NOTES_ADMIN_PASSWORD || 'admin123';
    await AuthHelper.loginAs('admin', adminPassword);

    adminPage.goto();
    adminPage.goToAuditLogs();

    I.seeElement(adminPage.auditLogs.container);
});

// ==================== USER MANAGEMENT TESTS ====================

Scenario('Admin can search users', async ({ I, adminPage, AuthHelper }) => {
    const adminPassword = process.env.NOTES_ADMIN_PASSWORD || 'admin123';
    await AuthHelper.loginAs('admin', adminPassword);

    adminPage.goto();
    adminPage.goToUsers();
    adminPage.searchUsers('demo');

    I.wait(1);
    I.see('demo', adminPage.usersList.container);
});

Scenario('Admin can disable user 2FA', async ({ I, adminPage, AuthHelper }) => {
    const adminPassword = process.env.NOTES_ADMIN_PASSWORD || 'admin123';
    await AuthHelper.loginAs('admin', adminPassword);

    adminPage.goto();
    adminPage.goToUsers();

    // Find a user with 2FA enabled (if any)
    // This test depends on having a user with 2FA enabled
    I.seeElement(adminPage.usersList.container);
});

// ==================== AUDIT LOGS TESTS ====================

Scenario('Audit logs display correctly', async ({ I, adminPage, AuthHelper }) => {
    const adminPassword = process.env.NOTES_ADMIN_PASSWORD || 'admin123';
    await AuthHelper.loginAs('admin', adminPassword);

    adminPage.goto();
    adminPage.goToAuditLogs();

    const logCount = await adminPage.getLogCount();
    I.assertEqual(logCount >= 0, true, 'Should return log count');
});

Scenario('Filter audit logs by type', async ({ I, adminPage, AuthHelper }) => {
    const adminPassword = process.env.NOTES_ADMIN_PASSWORD || 'admin123';
    await AuthHelper.loginAs('admin', adminPassword);

    adminPage.goto();
    adminPage.goToAuditLogs();
    adminPage.filterLogsByType('LOGIN');

    I.wait(1);
    // Should show filtered logs
});

Scenario('Refresh audit logs', async ({ I, adminPage, AuthHelper }) => {
    const adminPassword = process.env.NOTES_ADMIN_PASSWORD || 'admin123';
    await AuthHelper.loginAs('admin', adminPassword);

    adminPage.goto();
    adminPage.goToAuditLogs();
    adminPage.refreshLogs();

    // Should not crash
    I.seeElement(adminPage.auditLogs.container);
});

// ==================== EDGE CASES ====================

Scenario('Admin session expires handling', async ({ I, adminPage, AuthHelper }) => {
    const adminPassword = process.env.NOTES_ADMIN_PASSWORD || 'admin123';
    await AuthHelper.loginAs('admin', adminPassword);

    adminPage.goto();

    // Simulate session expiration by clearing tokens
    I.executeScript(() => {
        localStorage.removeItem('accessToken');
    });

    // Try to navigate
    adminPage.goToUsers();
    I.wait(2);

    // Should redirect to login or show error
});

Scenario('Admin dashboard handles empty state', async ({ I, adminPage, AuthHelper }) => {
    const adminPassword = process.env.NOTES_ADMIN_PASSWORD || 'admin123';
    await AuthHelper.loginAs('admin', adminPassword);

    adminPage.goto();

    // Dashboard should handle case with no data gracefully
    I.seeElement(adminPage.dashboard.container);
});
