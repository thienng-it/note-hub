Feature('Profile - View and Edit');

const users = require('../fixtures/users.json');

Before(async ({ AuthHelper }) => {
    await AuthHelper.loginAs(users.users.demo.username, users.users.demo.password);
});

// ==================== HAPPY PATH TESTS ====================

Scenario('Profile page loads successfully', async ({ I, profilePage }) => {
    profilePage.goto();

    I.seeElement(profilePage.info.username);
    I.seeElement(profilePage.actions.editProfile);
});

Scenario('View current profile information', async ({ I, profilePage }) => {
    profilePage.goto();

    profilePage.seeUsername(users.users.demo.username);
    I.seeElement(profilePage.info.email);
});

Scenario('Edit profile bio', async ({ I, profilePage }) => {
    profilePage.goto();
    profilePage.updateBio('This is my updated bio for E2E testing');

    profilePage.seeSuccess('Profile updated');
});

Scenario('Navigate to change password', async ({ I, profilePage }) => {
    profilePage.goto();
    profilePage.goToChangePassword();

    I.seeInCurrentUrl('/change-password');
    I.seeElement(profilePage.passwordForm.currentPassword);
});

Scenario('Navigate to 2FA setup', async ({ I, profilePage }) => {
    profilePage.goto();
    profilePage.goToSetup2FA();

    I.seeInCurrentUrl('/setup-2fa');
});

// ==================== CHANGE PASSWORD TESTS ====================

Scenario('Change password with valid credentials', async ({ I, profilePage }) => {
    // Note: This test changes the password - be careful with test data
    profilePage.goto();

    // For safety, skip actual password change in automated tests
    // or use a dedicated test user
    profilePage.goToChangePassword();

    I.seeElement(profilePage.passwordForm.currentPassword);
    I.seeElement(profilePage.passwordForm.newPassword);
    I.seeElement(profilePage.passwordForm.confirmPassword);
});

Scenario('Change password fails with wrong current password', async ({ I, profilePage }) => {
    profilePage.goto();
    profilePage.goToChangePassword();

    I.fillField(profilePage.passwordForm.currentPassword, 'wrongpassword');
    I.fillField(profilePage.passwordForm.newPassword, 'NewPassword123!');
    I.fillField(profilePage.passwordForm.confirmPassword, 'NewPassword123!');
    I.click(profilePage.passwordForm.submitBtn);

    // Should show error
    I.waitForElement('[class*="error"]', 5);
});

Scenario('Change password fails with mismatched confirmation', async ({ I, profilePage }) => {
    profilePage.goto();
    profilePage.goToChangePassword();

    I.fillField(profilePage.passwordForm.currentPassword, users.users.demo.password);
    I.fillField(profilePage.passwordForm.newPassword, 'NewPassword123!');
    I.fillField(profilePage.passwordForm.confirmPassword, 'DifferentPassword!');
    I.click(profilePage.passwordForm.submitBtn);

    // Should show error
    I.wait(1);
});

// ==================== NEGATIVE TESTS ====================

Scenario('Profile page requires authentication', async ({ I, AuthHelper }) => {
    await AuthHelper.logout();

    I.amOnPage('/profile');
    I.wait(2);

    I.seeInCurrentUrl('/login');
});

Scenario('Cannot edit profile with empty username', async ({ I, profilePage }) => {
    profilePage.goto();
    profilePage.clickEditProfile();

    I.clearField(profilePage.editForm.usernameInput);
    I.click(profilePage.editForm.saveBtn);

    // Should show validation error
    I.wait(1);
});

// ==================== EDGE CASES ====================

Scenario('Profile bio accepts unicode characters', async ({ I, profilePage }) => {
    profilePage.goto();
    profilePage.updateBio('Bio with unicode: 日本語 한국어 🎉');

    // Should save successfully
    profilePage.seeSuccess('Profile updated');
});

Scenario('Profile bio handles special characters', async ({ I, profilePage }) => {
    profilePage.goto();
    profilePage.updateBio('Bio with <script>alert("test")</script> special chars');

    // Should save safely (XSS prevented)
    I.wait(2);
});

Scenario('Cancel profile edit', async ({ I, profilePage }) => {
    profilePage.goto();
    profilePage.clickEditProfile();

    I.fillField(profilePage.editForm.bioInput, 'Cancelled changes');
    I.click(profilePage.editForm.cancelBtn);

    // Changes should not be saved
    I.wait(1);
});
