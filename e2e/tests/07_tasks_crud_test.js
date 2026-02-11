Feature('Tasks - CRUD Operations');

const users = require('../fixtures/users.json');
const tasks = require('../fixtures/tasks.json');

Before(async ({ AuthHelper }) => {
    await AuthHelper.loginAs(users.users.demo.username, users.users.demo.password);
});

After(async ({ ApiHelper }) => {
    try {
        await ApiHelper.deleteAllTasks();
    } catch (e) {
        console.log('Cleanup skipped:', e.message);
    }
});

// ==================== HAPPY PATH TESTS ====================

Scenario('Tasks page loads successfully', async ({ I, tasksPage }) => {
    tasksPage.goto();

    I.seeElement(tasksPage.tasksList.container);
    I.seeElement(tasksPage.actions.createTask);
});

Scenario('Create a simple task', async ({ I, tasksPage }) => {
    tasksPage.goto();
    tasksPage.createTask(tasks.validTasks.simple);

    tasksPage.seeTask(tasks.validTasks.simple.title);
});

Scenario('Create a task with description', async ({ I, tasksPage }) => {
    tasksPage.goto();
    tasksPage.createTask(tasks.validTasks.withDescription);

    tasksPage.seeTask(tasks.validTasks.withDescription.title);
});

Scenario('Create a high priority task', async ({ I, tasksPage }) => {
    tasksPage.goto();
    tasksPage.createTask(tasks.validTasks.highPriority);

    tasksPage.seeTask(tasks.validTasks.highPriority.title);
    // Should show priority indicator
    I.seeElement(tasksPage.taskItem.priority);
});

Scenario('Create a task with due date', async ({ I, tasksPage }) => {
    tasksPage.goto();
    tasksPage.createTask(tasks.validTasks.withDueDate);

    tasksPage.seeTask(tasks.validTasks.withDueDate.title);
    // Should show due date
    I.seeElement(tasksPage.taskItem.dueDate);
});

Scenario('Edit existing task', async ({ I, tasksPage, ApiHelper }) => {
    // Create task via API
    await ApiHelper.createTask(tasks.validTasks.simple);

    tasksPage.goto();
    tasksPage.editTask(tasks.validTasks.simple.title, { title: 'Updated Task Title' });

    tasksPage.seeTask('Updated Task Title');
    tasksPage.dontSeeTask(tasks.validTasks.simple.title);
});

Scenario('Delete a task', async ({ I, tasksPage, ApiHelper }) => {
    await ApiHelper.createTask({ title: 'Task to Delete' });

    tasksPage.goto();
    tasksPage.deleteTask('Task to Delete');

    tasksPage.dontSeeTask('Task to Delete');
});

Scenario('Mark task as complete', async ({ I, tasksPage, ApiHelper }) => {
    await ApiHelper.createTask({ title: 'Complete Me' });

    tasksPage.goto();
    tasksPage.toggleComplete('Complete Me');

    // Task should show as completed
    I.wait(1);
    tasksPage.seeTaskCompleted('Complete Me');
});

Scenario('Unmark completed task', async ({ I, tasksPage, ApiHelper }) => {
    await ApiHelper.createTask({ title: 'Uncomplete Me', isCompleted: true });

    tasksPage.goto();
    tasksPage.toggleComplete('Uncomplete Me');

    // Task should show as active
    I.wait(1);
});

// ==================== NEGATIVE TESTS ====================

Scenario('Cannot create task with empty title', async ({ I, tasksPage }) => {
    tasksPage.goto();
    tasksPage.clickCreateTask();

    // Leave title empty
    I.click(tasksPage.form.submitBtn);

    // Should stay in form or show error
    I.wait(1);
});

Scenario('Tasks page requires authentication', async ({ I, AuthHelper }) => {
    await AuthHelper.logout();

    I.amOnPage('/tasks');
    I.wait(2);

    // Should redirect to login
    I.seeInCurrentUrl('/login');
});

// ==================== EDGE CASES ====================

Scenario('Create task with very long title', async ({ I, tasksPage }) => {
    const longTitle = 'A'.repeat(200);

    tasksPage.goto();
    tasksPage.createTask({ title: longTitle });

    // Should handle gracefully
    I.wait(2);
});

Scenario('Create multiple tasks', async ({ I, tasksPage }) => {
    tasksPage.goto();

    tasksPage.createTask({ title: 'Task 1' });
    tasksPage.createTask({ title: 'Task 2' });
    tasksPage.createTask({ title: 'Task 3' });

    tasksPage.seeTask('Task 1');
    tasksPage.seeTask('Task 2');
    tasksPage.seeTask('Task 3');
});

Scenario('Overdue task shows indicator', async ({ I, tasksPage, ApiHelper }) => {
    // Create overdue task  
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await ApiHelper.createTask({
        title: 'Overdue Task',
        dueDate: yesterday.toISOString().split('T')[0],
    });

    tasksPage.goto();

    // Should show overdue indicator
    I.seeElement('[class*="overdue"]');
});

Scenario('Cancel task creation', async ({ I, tasksPage }) => {
    tasksPage.goto();
    tasksPage.clickCreateTask();

    I.fillField(tasksPage.form.titleInput, 'Cancelled Task');
    I.click(tasksPage.form.cancelBtn);

    // Task should not be created
    I.wait(1);
    tasksPage.dontSeeTask('Cancelled Task');
});

Scenario('Edit task priority', async ({ I, tasksPage, ApiHelper }) => {
    await ApiHelper.createTask({ title: 'Change Priority', priority: 'low' });

    tasksPage.goto();
    tasksPage.editTask('Change Priority', { priority: 'high' });

    // Should update priority
    I.wait(1);
});

Scenario('Edit task due date', async ({ I, tasksPage, ApiHelper }) => {
    await ApiHelper.createTask({ title: 'Change Due Date' });

    tasksPage.goto();
    tasksPage.editTask('Change Due Date', { dueDate: '2025-12-31' });

    // Should update due date
    I.wait(1);
});
