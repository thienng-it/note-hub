const { I } = inject();

/**
 * Notes Page Object
 * Contains selectors and methods for the notes page
 */
module.exports = {
    // Selectors
    root: '/notes',

    notesList: {
        container: '[data-testid="notes-list"]',
        item: '[data-testid="note-item"]',
        title: '[data-testid="note-title"]',
        content: '[data-testid="note-content"]',
        emptyState: '[data-testid="empty-notes"]',
    },

    actions: {
        createNote: '[data-testid="create-note"]',
        searchInput: '[data-testid="search-input"]',
        searchButton: '[data-testid="search-button"]',
        clearSearch: '[data-testid="clear-search"]',
        filterFavorites: '[data-testid="filter-favorites"]',
        filterPinned: '[data-testid="filter-pinned"]',
        filterAll: '[data-testid="filter-all"]',
    },

    noteItem: {
        favoriteBtn: '[data-testid="favorite-btn"]',
        pinBtn: '[data-testid="pin-btn"]',
        deleteBtn: '[data-testid="delete-btn"]',
        editBtn: '[data-testid="edit-btn"]',
        shareBtn: '[data-testid="share-btn"]',
        tags: '[data-testid="note-tags"]',
    },

    editor: {
        titleInput: '[data-testid="note-title-input"]',
        contentInput: '[data-testid="note-content-input"]',
        saveBtn: '[data-testid="save-note"]',
        cancelBtn: '[data-testid="cancel-edit"]',
        tagsInput: '[data-testid="tags-input"]',
    },

    folders: {
        sidebar: '[data-testid="folder-sidebar"]',
        createBtn: '[data-testid="create-folder"]',
        folderItem: '[data-testid="folder-item"]',
        folderName: '[data-testid="folder-name"]',
    },

    modals: {
        deleteConfirm: '[data-testid="delete-confirm-modal"]',
        confirmBtn: '[data-testid="confirm-delete"]',
        cancelBtn: '[data-testid="cancel-delete"]',
    },

    // Methods
    /**
     * Navigate to notes page
     */
    goto() {
        I.amOnPage(this.root);
        I.waitForElement(this.notesList.container, 10);
    },

    /**
     * Click create new note button
     */
    clickCreateNote() {
        I.click(this.actions.createNote);
        I.waitForElement(this.editor.titleInput, 5);
    },

    /**
     * Create a new note
     * @param {string} title
     * @param {string} content
     * @param {string[]} tags
     */
    createNote(title, content, tags = []) {
        this.clickCreateNote();
        I.fillField(this.editor.titleInput, title);
        I.fillField(this.editor.contentInput, content);

        if (tags.length > 0) {
            for (const tag of tags) {
                I.fillField(this.editor.tagsInput, tag);
                I.pressKey('Enter');
            }
        }

        I.click(this.editor.saveBtn);
        I.waitForElement(this.notesList.item, 5);
    },

    /**
     * Search for notes
     * @param {string} query
     */
    searchNotes(query) {
        I.fillField(this.actions.searchInput, query);
        I.click(this.actions.searchButton);
        I.wait(1); // Wait for search results
    },

    /**
     * Clear search
     */
    clearSearch() {
        I.click(this.actions.clearSearch);
        I.wait(1);
    },

    /**
     * Get number of visible notes
     * @returns {Promise<number>}
     */
    async getNotesCount() {
        return await I.grabNumberOfVisibleElements(this.notesList.item);
    },

    /**
     * Click on a note by title
     * @param {string} title
     */
    clickNote(title) {
        I.click(locate(this.notesList.item).withText(title));
    },

    /**
     * Toggle favorite on a note
     * @param {string} title
     */
    toggleFavorite(title) {
        const noteItem = locate(this.notesList.item).withText(title);
        I.click(locate(this.noteItem.favoriteBtn).inside(noteItem));
    },

    /**
     * Toggle pin on a note
     * @param {string} title
     */
    togglePin(title) {
        const noteItem = locate(this.notesList.item).withText(title);
        I.click(locate(this.noteItem.pinBtn).inside(noteItem));
    },

    /**
     * Delete a note
     * @param {string} title
     */
    deleteNote(title) {
        const noteItem = locate(this.notesList.item).withText(title);
        I.click(locate(this.noteItem.deleteBtn).inside(noteItem));
        I.waitForElement(this.modals.deleteConfirm, 5);
        I.click(this.modals.confirmBtn);
        I.wait(1);
    },

    /**
     * Filter notes by favorites
     */
    filterByFavorites() {
        I.click(this.actions.filterFavorites);
        I.wait(1);
    },

    /**
     * Filter notes by pinned
     */
    filterByPinned() {
        I.click(this.actions.filterPinned);
        I.wait(1);
    },

    /**
     * Show all notes
     */
    showAllNotes() {
        I.click(this.actions.filterAll);
        I.wait(1);
    },

    /**
     * Verify note exists
     * @param {string} title
     */
    seeNote(title) {
        I.see(title, this.notesList.container);
    },

    /**
     * Verify note does not exist
     * @param {string} title
     */
    dontSeeNote(title) {
        I.dontSee(title, this.notesList.container);
    },

    /**
     * Verify empty state is shown
     */
    seeEmptyState() {
        I.seeElement(this.notesList.emptyState);
    },
};
