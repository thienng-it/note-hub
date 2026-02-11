// Custom steps file for extending CodeceptJS I object
// Add custom methods here

module.exports = function () {
    return actor({
        /**
         * Login as a user via UI
         * @param {string} username
         * @param {string} password
         */
        loginViaUI: async function (username, password) {
            this.amOnPage('/login');
            this.fillField('#username', username);
            this.fillField('#password', password);
            this.click('button[type="submit"]');
            this.waitForNavigation();
        },

        /**
         * Wait for toast notification
         * @param {string} text - Expected text in toast
         */
        seeToast: function (text) {
            this.waitForElement('[class*="toast"]', 5);
            this.see(text, '[class*="toast"]');
        },

        /**
         * Wait for page to be fully loaded
         */
        waitForPageLoad: function () {
            this.waitForFunction(() => document.readyState === 'complete', [], 10);
        },

        /**
         * Clear all input fields in a form
         * @param {string} formSelector
         */
        clearForm: async function (formSelector) {
            const inputs = await this.grabAttributeFromAll(`${formSelector} input`, 'id');
            for (const id of inputs) {
                if (id) this.clearField(`#${id}`);
            }
        },

        /**
         * Check if element is visible
         * @param {string} selector
         * @returns {Promise<boolean>}
         */
        isVisible: async function (selector) {
            try {
                await this.waitForElement(selector, 1);
                return true;
            } catch (e) {
                return false;
            }
        },

        /**
         * Scroll to element
         * @param {string} selector
         */
        scrollToElement: function (selector) {
            this.executeScript((sel) => {
                document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, selector);
        },
    });
};
