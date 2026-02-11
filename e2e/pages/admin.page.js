const { I } = inject();

/**
 * Admin Page Object
 * Contains selectors and methods for the admin dashboard
 */
module.exports = {
    // Selectors
    root: '/admin',

    dashboard: {
        container: '[data-testid="admin-dashboard"]',
        stats: '[data-testid="admin-stats"]',
        userCount: '[data-testid="user-count"]',
        noteCount: '[data-testid="note-count"]',
        taskCount: '[data-testid="task-count"]',
    },

    navigation: {
        users: '[data-testid="nav-users"]',
        auditLogs: '[data-testid="nav-audit-logs"]',
        settings: '[data-testid="nav-settings"]',
    },

    usersList: {
        container: '[data-testid="users-list"]',
        userItem: '[data-testid="user-item"]',
        searchInput: '[data-testid="search-users"]',
        disable2FABtn: '[data-testid="disable-2fa-btn"]',
        deleteUserBtn: '[data-testid="delete-user-btn"]',
    },

    auditLogs: {
        container: '[data-testid="audit-logs"]',
        logItem: '[data-testid="log-item"]',
        filterSelect: '[data-testid="log-filter"]',
        dateFilter: '[data-testid="date-filter"]',
        refreshBtn: '[data-testid="refresh-logs"]',
    },

    modals: {
        confirmAction: '[data-testid="confirm-action-modal"]',
        confirmBtn: '[data-testid="confirm-btn"]',
        cancelBtn: '[data-testid="cancel-btn"]',
    },

    messages: {
        success: '[class*="success"]',
        error: '[class*="error"]',
        accessDenied: '[data-testid="access-denied"]',
    },

    // Methods
    /**
     * Navigate to admin dashboard
     */
    goto() {
        I.amOnPage(this.root);
        I.waitForElement(this.dashboard.container, 10);
    },

    /**
     * Check if on admin dashboard
     */
    seeAdminDashboard() {
        I.seeElement(this.dashboard.container);
    },

    /**
     * Check access denied message (for non-admins)
     */
    seeAccessDenied() {
        I.seeElement(this.messages.accessDenied);
    },

    /**
     * Go to users management
     */
    goToUsers() {
        I.click(this.navigation.users);
        I.waitForElement(this.usersList.container, 5);
    },

    /**
     * Go to audit logs
     */
    goToAuditLogs() {
        I.click(this.navigation.auditLogs);
        I.waitForElement(this.auditLogs.container, 5);
    },

    /**
     * Search for a user
     * @param {string} query
     */
    searchUsers(query) {
        I.fillField(this.usersList.searchInput, query);
        I.wait(1);
    },

    /**
     * Disable 2FA for a user
     * @param {string} username
     */
    disable2FAForUser(username) {
        const userItem = locate(this.usersList.userItem).withText(username);
        I.click(locate(this.usersList.disable2FABtn).inside(userItem));
        I.waitForElement(this.modals.confirmAction, 5);
        I.click(this.modals.confirmBtn);
        I.waitForElement(this.messages.success, 5);
    },

    /**
     * Get user count from dashboard
     * @returns {Promise<string>}
     */
    async getUserCount() {
        return await I.grabTextFrom(this.dashboard.userCount);
    },

    /**
     * Filter audit logs by type
     * @param {string} type - log type filter
     */
    filterLogsByType(type) {
        I.selectOption(this.auditLogs.filterSelect, type);
        I.wait(1);
    },

    /**
     * Refresh audit logs
     */
    refreshLogs() {
        I.click(this.auditLogs.refreshBtn);
        I.wait(2);
    },

    /**
     * Get number of visible log entries
     * @returns {Promise<number>}
     */
    async getLogCount() {
        return await I.grabNumberOfVisibleElements(this.auditLogs.logItem);
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
