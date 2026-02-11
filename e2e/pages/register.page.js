const { I } = inject();

/**
 * Register Page Object
 * Contains selectors and methods for the registration page
 */
module.exports = {
    // Selectors
    fields: {
        username: '#username',
        email: '#email',
        password: '#password',
        confirmPassword: '#confirmPassword',
    },
    buttons: {
        submit: 'button[type="submit"]',
        login: 'a[href="/login"]',
    },
    messages: {
        error: '[class*="error"]',
        success: '[class*="success"]',
    },
    validation: {
        usernameError: '#username-error',
        emailError: '#email-error',
        passwordError: '#password-error',
        confirmPasswordError: '#confirmPassword-error',
    },

    // Methods
    /**
     * Navigate to register page
     */
    goto() {
        I.amOnPage('/register');
        I.waitForElement(this.fields.username, 10);
    },

    /**
     * Fill registration form
     * @param {object} userData - { username, email, password, confirmPassword? }
     */
    fillForm(userData) {
        I.fillField(this.fields.username, userData.username);
        I.fillField(this.fields.email, userData.email);
        I.fillField(this.fields.password, userData.password);
        I.fillField(this.fields.confirmPassword, userData.confirmPassword || userData.password);
    },

    /**
     * Submit registration form
     */
    submit() {
        I.click(this.buttons.submit);
    },

    /**
     * Complete registration flow
     * @param {object} userData
     */
    register(userData) {
        this.fillForm(userData);
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
     * Check for field-specific validation error
     * @param {string} field - 'username', 'email', 'password', 'confirmPassword'
     * @param {string} expectedText
     */
    seeFieldError(field, expectedText) {
        const errorSelector = this.validation[`${field}Error`];
        I.waitForElement(errorSelector, 5);
        I.see(expectedText, errorSelector);
    },

    /**
     * Go to login page
     */
    goToLogin() {
        I.click(this.buttons.login);
        I.waitForNavigation();
    },
};
