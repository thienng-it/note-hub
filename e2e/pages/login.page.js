const { I } = inject();

/**
 * Login Page Object
 * Contains selectors and methods for the login page
 */
module.exports = {
    // Selectors
    fields: {
        username: '#username',
        password: '#password',
    },
    buttons: {
        submit: 'button[type="submit"]',
        googleSignIn: '[data-testid="google-signin"]',
        githubSignIn: '[data-testid="github-signin"]',
        passkeySignIn: '[data-testid="passkey-signin"]',
        forgotPassword: 'a[href="/forgot-password"]',
        register: 'a[href="/register"]',
    },
    messages: {
        error: '[class*="error"]',
        success: '[class*="success"]',
    },
    languageSelector: '[data-testid="language-selector"]',

    // Methods
    /**
     * Navigate to login page
     */
    goto() {
        I.amOnPage('/login');
        I.waitForElement(this.fields.username, 10);
    },

    /**
     * Fill login form
     * @param {string} username
     * @param {string} password
     */
    fillLoginForm(username, password) {
        I.fillField(this.fields.username, username);
        I.fillField(this.fields.password, password);
    },

    /**
     * Submit login form
     */
    submit() {
        I.click(this.buttons.submit);
    },

    /**
     * Complete login flow
     * @param {string} username
     * @param {string} password
     */
    login(username, password) {
        this.fillLoginForm(username, password);
        this.submit();
        I.waitForNavigation();
    },

    /**
     * Check for error message
     * @param {string} expectedText
     */
    seeError(expectedText) {
        I.waitForElement(this.messages.error, 5);
        I.see(expectedText, this.messages.error);
    },

    /**
     * Check no error visible
     */
    dontSeeError() {
        I.dontSeeElement(this.messages.error);
    },

    /**
     * Click Google Sign In button
     */
    clickGoogleSignIn() {
        I.click(this.buttons.googleSignIn);
    },

    /**
     * Click GitHub Sign In button
     */
    clickGitHubSignIn() {
        I.click(this.buttons.githubSignIn);
    },

    /**
     * Click Passkey Sign In button
     */
    clickPasskeySignIn() {
        I.click(this.buttons.passkeySignIn);
    },

    /**
     * Click forgot password link
     */
    clickForgotPassword() {
        I.click(this.buttons.forgotPassword);
    },

    /**
     * Click register link
     */
    clickRegister() {
        I.click(this.buttons.register);
    },

    /**
     * Change language
     * @param {string} language - language code (e.g., 'en', 'vi', 'de', 'ja')
     */
    changeLanguage(language) {
        I.click(this.languageSelector);
        I.click(`[data-language="${language}"]`);
    },
};
