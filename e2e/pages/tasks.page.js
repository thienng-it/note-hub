const { I } = inject();

/**
 * Tasks Page Object
 * Contains selectors and methods for the tasks page
 */
module.exports = {
    // Selectors
    root: '/tasks',

    tasksList: {
        container: '[data-testid="tasks-list"]',
        item: '[data-testid="task-item"]',
        title: '[data-testid="task-title"]',
        emptyState: '[data-testid="empty-tasks"]',
    },

    actions: {
        createTask: '[data-testid="create-task"]',
        filterAll: '[data-testid="filter-all"]',
        filterActive: '[data-testid="filter-active"]',
        filterCompleted: '[data-testid="filter-completed"]',
        priorityFilter: '[data-testid="priority-filter"]',
    },

    taskItem: {
        checkbox: '[data-testid="task-checkbox"]',
        deleteBtn: '[data-testid="delete-task"]',
        editBtn: '[data-testid="edit-task"]',
        priority: '[data-testid="task-priority"]',
        dueDate: '[data-testid="task-due-date"]',
    },

    form: {
        titleInput: '[data-testid="task-title-input"]',
        descriptionInput: '[data-testid="task-description-input"]',
        prioritySelect: '[data-testid="task-priority-select"]',
        dueDateInput: '[data-testid="task-due-date-input"]',
        submitBtn: '[data-testid="submit-task"]',
        cancelBtn: '[data-testid="cancel-task"]',
    },

    templates: {
        templateBtn: '[data-testid="template-btn"]',
        templateList: '[data-testid="template-list"]',
        templateItem: '[data-testid="template-item"]',
    },

    modals: {
        deleteConfirm: '[data-testid="delete-confirm-modal"]',
        confirmBtn: '[data-testid="confirm-delete"]',
        cancelBtn: '[data-testid="cancel-delete"]',
    },

    // Methods
    /**
     * Navigate to tasks page
     */
    goto() {
        I.amOnPage(this.root);
        I.waitForElement(this.tasksList.container, 10);
    },

    /**
     * Click create new task button
     */
    clickCreateTask() {
        I.click(this.actions.createTask);
        I.waitForElement(this.form.titleInput, 5);
    },

    /**
     * Create a new task
     * @param {object} taskData - { title, description?, priority?, dueDate? }
     */
    createTask(taskData) {
        this.clickCreateTask();
        I.fillField(this.form.titleInput, taskData.title);

        if (taskData.description) {
            I.fillField(this.form.descriptionInput, taskData.description);
        }

        if (taskData.priority) {
            I.selectOption(this.form.prioritySelect, taskData.priority);
        }

        if (taskData.dueDate) {
            I.fillField(this.form.dueDateInput, taskData.dueDate);
        }

        I.click(this.form.submitBtn);
        I.wait(1);
    },

    /**
     * Get number of visible tasks
     * @returns {Promise<number>}
     */
    async getTasksCount() {
        return await I.grabNumberOfVisibleElements(this.tasksList.item);
    },

    /**
     * Toggle task completion
     * @param {string} title
     */
    toggleComplete(title) {
        const taskItem = locate(this.tasksList.item).withText(title);
        I.click(locate(this.taskItem.checkbox).inside(taskItem));
        I.wait(1);
    },

    /**
     * Delete a task
     * @param {string} title
     */
    deleteTask(title) {
        const taskItem = locate(this.tasksList.item).withText(title);
        I.click(locate(this.taskItem.deleteBtn).inside(taskItem));
        I.waitForElement(this.modals.deleteConfirm, 5);
        I.click(this.modals.confirmBtn);
        I.wait(1);
    },

    /**
     * Edit a task
     * @param {string} title
     * @param {object} newData
     */
    editTask(title, newData) {
        const taskItem = locate(this.tasksList.item).withText(title);
        I.click(locate(this.taskItem.editBtn).inside(taskItem));
        I.waitForElement(this.form.titleInput, 5);

        if (newData.title) {
            I.clearField(this.form.titleInput);
            I.fillField(this.form.titleInput, newData.title);
        }

        if (newData.description) {
            I.clearField(this.form.descriptionInput);
            I.fillField(this.form.descriptionInput, newData.description);
        }

        if (newData.priority) {
            I.selectOption(this.form.prioritySelect, newData.priority);
        }

        I.click(this.form.submitBtn);
        I.wait(1);
    },

    /**
     * Filter tasks by status
     * @param {string} status - 'all', 'active', 'completed'
     */
    filterByStatus(status) {
        const filterMap = {
            'all': this.actions.filterAll,
            'active': this.actions.filterActive,
            'completed': this.actions.filterCompleted,
        };
        I.click(filterMap[status]);
        I.wait(1);
    },

    /**
     * Filter tasks by priority
     * @param {string} priority - 'all', 'high', 'medium', 'low'
     */
    filterByPriority(priority) {
        I.click(this.actions.priorityFilter);
        I.click(`[data-priority="${priority}"]`);
        I.wait(1);
    },

    /**
     * Apply a task template
     * @param {string} templateName
     */
    applyTemplate(templateName) {
        I.click(this.templates.templateBtn);
        I.waitForElement(this.templates.templateList, 5);
        I.click(locate(this.templates.templateItem).withText(templateName));
        I.wait(1);
    },

    /**
     * Verify task exists
     * @param {string} title
     */
    seeTask(title) {
        I.see(title, this.tasksList.container);
    },

    /**
     * Verify task does not exist
     * @param {string} title
     */
    dontSeeTask(title) {
        I.dontSee(title, this.tasksList.container);
    },

    /**
     * Verify empty state is shown
     */
    seeEmptyState() {
        I.seeElement(this.tasksList.emptyState);
    },

    /**
     * Check if task is completed (has strikethrough)
     * @param {string} title
     */
    seeTaskCompleted(title) {
        I.seeElement(locate(this.tasksList.item).withText(title).find('[class*="completed"]'));
    },
};
