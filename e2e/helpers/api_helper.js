const Helper = require('@codeceptjs/helper');

/**
 * ApiHelper - Direct API calls for test setup and teardown
 * Provides methods to create/delete test data
 */
class ApiHelper extends Helper {
    constructor(config) {
        super(config);
        this.baseUrl = config.apiUrl || process.env.API_URL || 'http://localhost:5000';
    }

    /**
     * Get REST helper with auth headers
     * @returns {object} REST helper with Authorization header
     */
    _getAuthenticatedREST() {
        const REST = this.helpers.REST;
        const AuthHelper = this.helpers.AuthHelper;
        const token = AuthHelper.getAccessToken();

        if (token) {
            REST.haveRequestHeaders({ Authorization: `Bearer ${token}` });
        }

        return REST;
    }

    // ==================== NOTES API ====================

    /**
     * Create a note via API
     * @param {object} noteData - { title, content, tags?, folderId?, isPinned?, isFavorite? }
     * @returns {Promise<object>} Created note
     */
    async createNote(noteData) {
        const REST = this._getAuthenticatedREST();
        const response = await REST.sendPostRequest('/api/notes', noteData);

        if (response.status !== 201) {
            throw new Error(`Failed to create note: ${response.status}`);
        }

        return response.data;
    }

    /**
     * Get all notes
     * @returns {Promise<object[]>}
     */
    async getNotes() {
        const REST = this._getAuthenticatedREST();
        const response = await REST.sendGetRequest('/api/notes');
        return response.data;
    }

    /**
     * Delete a note
     * @param {number} noteId
     */
    async deleteNote(noteId) {
        const REST = this._getAuthenticatedREST();
        await REST.sendDeleteRequest(`/api/notes/${noteId}`);
    }

    /**
     * Delete all notes for current user (cleanup)
     */
    async deleteAllNotes() {
        const notes = await this.getNotes();
        for (const note of notes) {
            await this.deleteNote(note.id);
        }
    }

    // ==================== TASKS API ====================

    /**
     * Create a task via API
     * @param {object} taskData - { title, description?, priority?, dueDate?, folderId? }
     * @returns {Promise<object>} Created task
     */
    async createTask(taskData) {
        const REST = this._getAuthenticatedREST();
        const response = await REST.sendPostRequest('/api/tasks', taskData);

        if (response.status !== 201) {
            throw new Error(`Failed to create task: ${response.status}`);
        }

        return response.data;
    }

    /**
     * Get all tasks
     * @returns {Promise<object[]>}
     */
    async getTasks() {
        const REST = this._getAuthenticatedREST();
        const response = await REST.sendGetRequest('/api/tasks');
        return response.data;
    }

    /**
     * Delete a task
     * @param {number} taskId
     */
    async deleteTask(taskId) {
        const REST = this._getAuthenticatedREST();
        await REST.sendDeleteRequest(`/api/tasks/${taskId}`);
    }

    /**
     * Delete all tasks for current user (cleanup)
     */
    async deleteAllTasks() {
        const tasks = await this.getTasks();
        for (const task of tasks) {
            await this.deleteTask(task.id);
        }
    }

    // ==================== FOLDERS API ====================

    /**
     * Create a folder via API
     * @param {object} folderData - { name, icon?, color?, parentId?, type }
     * @returns {Promise<object>} Created folder
     */
    async createFolder(folderData) {
        const REST = this._getAuthenticatedREST();
        const response = await REST.sendPostRequest('/api/folders', folderData);

        if (response.status !== 201) {
            throw new Error(`Failed to create folder: ${response.status}`);
        }

        return response.data;
    }

    /**
     * Delete a folder
     * @param {number} folderId
     */
    async deleteFolder(folderId) {
        const REST = this._getAuthenticatedREST();
        await REST.sendDeleteRequest(`/api/folders/${folderId}`);
    }

    // ==================== CLEANUP ====================

    /**
     * Clean up all test data for current user
     */
    async cleanupTestData() {
        try {
            await this.deleteAllNotes();
        } catch (e) {
            console.log('No notes to delete or error:', e.message);
        }

        try {
            await this.deleteAllTasks();
        } catch (e) {
            console.log('No tasks to delete or error:', e.message);
        }
    }

    // ==================== USER API ====================

    /**
     * Register a new user
     * @param {object} userData - { username, email, password }
     * @returns {Promise<object>} Created user
     */
    async registerUser(userData) {
        const REST = this.helpers.REST;
        const response = await REST.sendPostRequest('/api/auth/register', userData);

        if (response.status !== 201 && response.status !== 200) {
            throw new Error(`Failed to register user: ${response.status} - ${JSON.stringify(response.data)}`);
        }

        return response.data;
    }

    /**
     * Check if Google OAuth is enabled
     * @returns {Promise<boolean>}
     */
    async isGoogleOAuthEnabled() {
        const REST = this.helpers.REST;
        const response = await REST.sendGetRequest('/api/auth/google/status');
        return response.data?.enabled || false;
    }
}

module.exports = ApiHelper;
