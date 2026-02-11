const { I } = inject();

/**
 * Profile Page Object
 * Contains selectors and methods for the profile page
 */
module.exports = {
    // Selectors
    root: '/profile',

    info: {
        username: '[data-testid="profile-username"]',
        email: '[data-testid="profile-email"]',
        bio: '[data-testid="profile-bio"]',
        avatar: '[data-testid="profile-avatar"]',
        createdAt: '[data-testid="profile-created-at"]',
    },

    actions: {
        editProfile: '[data-testid="edit-profile"]',
        changePassword: 'a[href="/change-password"]',
        setup2FA: 'a[href="/setup-2fa"]',
        disable2FA: 'a[href="/disable-2fa"]',
        managePasskeys: '[data-testid="manage-passkeys"]',
    },

    editForm: {
        usernameInput: '#username',
        emailInput: '#email',
        bioInput: '#bio',
        avatarUpload: '#avatar-upload',
        saveBtn: '[data-testid="save-profile"]',
        cancelBtn: '[data-testid="cancel-edit"]',
    },

    passwordForm: {
        currentPassword: '#currentPassword',
        newPassword: '#newPassword',
        confirmPassword: '#confirmPassword',
        submitBtn: 'button[type="submit"]',
    },

    settings: {
        themeToggle: '[data-testid="theme-toggle"]',
        languageSelector: '[data-testid="language-selector"]',
    },

    messages: {
        success: '[class*="success"]',
        error: '[class*="error"]',
    },

    // Methods
    /**
     * Navigate to profile page
     */
    goto() {
        I.amOnPage(this.root);
        I.waitForElement(this.info.username, 10);
    },

    /**
     * Click edit profile button
     */
    clickEditProfile() {
        I.click(this.actions.editProfile);
        I.waitForElement(this.editForm.bioInput, 5);
    },

    /**
     * Update profile bio
     * @param {string} newBio
     */
    updateBio(newBio) {
        this.clickEditProfile();
        I.clearField(this.editForm.bioInput);
        I.fillField(this.editForm.bioInput, newBio);
        I.click(this.editForm.saveBtn);
        I.waitForElement(this.messages.success, 5);
    },

    /**
     * Go to change password page
     */
    goToChangePassword() {
        I.click(this.actions.changePassword);
        I.waitForElement(this.passwordForm.currentPassword, 5);
    },

    /**
     * Change password
     * @param {string} currentPassword
     * @param {string} newPassword
     */
    changePassword(currentPassword, newPassword) {
        this.goToChangePassword();
        I.fillField(this.passwordForm.currentPassword, currentPassword);
        I.fillField(this.passwordForm.newPassword, newPassword);
        I.fillField(this.passwordForm.confirmPassword, newPassword);
        I.click(this.passwordForm.submitBtn);
    },

    /**
     * Toggle theme (dark/light mode)
     */
    toggleTheme() {
        I.click(this.settings.themeToggle);
        I.wait(1);
    },

    /**
     * Change language
     * @param {string} language - language code
     */
    changeLanguage(language) {
        I.click(this.settings.languageSelector);
        I.click(`[data-language="${language}"]`);
        I.wait(1);
    },

    /**
     * Go to 2FA setup
     */
    goToSetup2FA() {
        I.click(this.actions.setup2FA);
        I.waitForNavigation();
    },

    /**
     * Go to disable 2FA
     */
    goToDisable2FA() {
        I.click(this.actions.disable2FA);
        I.waitForNavigation();
    },

    /**
     * Go to manage passkeys
     */
    goToManagePasskeys() {
        I.click(this.actions.managePasskeys);
        I.waitForElement('[data-testid="passkeys-list"]', 5);
    },

    /**
     * Verify profile info
     * @param {string} username
     */
    seeUsername(username) {
        I.see(username, this.info.username);
    },

    /**
     * Verify success message
     * @param {string} text
     */
    seeSuccess(text) {
        I.waitForElement(this.messages.success, 5);
        I.see(text, this.messages.success);
    },

    /**
     * Verify error message
     * @param {string} text
     */
    seeError(text) {
        I.waitForElement(this.messages.error, 5);
        I.see(text, this.messages.error);
    },
};
