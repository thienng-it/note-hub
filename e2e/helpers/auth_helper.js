const Helper = require('@codeceptjs/helper');

/**
 * AuthHelper - Handles authentication for E2E tests
 * Provides methods to login via API and inject auth tokens
 */
class AuthHelper extends Helper {
    constructor(config) {
        super(config);
        this.baseUrl = config.apiUrl || process.env.API_URL || 'http://localhost:5000';
    }

    /**
     * Login via API and store the JWT token
     * @param {string} username
     * @param {string} password
     * @returns {Promise<{accessToken: string, refreshToken: string, user: object}>}
     */
    async loginViaApi(username, password) {
        const REST = this.helpers.REST;

        const response = await REST.sendPostRequest('/api/auth/login', {
            username,
            password,
        });

        if (response.status !== 200) {
            throw new Error(`Login failed: ${response.status} - ${JSON.stringify(response.data)}`);
        }

        this.authData = response.data;
        return response.data;
    }

    /**
     * Set authentication in browser (localStorage and cookie)
     * Must be called after loginViaApi
     */
    async setAuthInBrowser() {
        if (!this.authData) {
            throw new Error('No auth data. Call loginViaApi first.');
        }

        const { Playwright } = this.helpers;

        await Playwright.executeScript((authData) => {
            localStorage.setItem('accessToken', authData.accessToken);
            localStorage.setItem('refreshToken', authData.refreshToken);
            localStorage.setItem('user', JSON.stringify(authData.user));
        }, this.authData);
    }

    /**
     * Complete login flow - login via API and set auth in browser
     * @param {string} username
     * @param {string} password
     */
    async loginAs(username, password) {
        await this.loginViaApi(username, password);

        const { Playwright } = this.helpers;
        // Navigate to app first to set localStorage
        await Playwright.amOnPage('/');
        await this.setAuthInBrowser();
        // Reload to apply auth
        await Playwright.refreshPage();
        await Playwright.waitForNavigation();
    }

    /**
     * Logout - clear auth data
     */
    async logout() {
        const { Playwright } = this.helpers;

        await Playwright.executeScript(() => {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
        });

        this.authData = null;
        await Playwright.amOnPage('/login');
    }

    /**
     * Check if currently logged in
     * @returns {Promise<boolean>}
     */
    async isLoggedIn() {
        const { Playwright } = this.helpers;

        const token = await Playwright.executeScript(() => {
            return localStorage.getItem('accessToken');
        });

        return !!token;
    }

    /**
     * Get current auth token
     * @returns {string|null}
     */
    getAccessToken() {
        return this.authData?.accessToken || null;
    }

    /**
     * Get current user data
     * @returns {object|null}
     */
    getCurrentUser() {
        return this.authData?.user || null;
    }
}

module.exports = AuthHelper;
