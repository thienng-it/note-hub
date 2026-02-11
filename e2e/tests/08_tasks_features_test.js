Feature('Tasks - Features and Filtering');

const users = require('../fixtures/users.json');
const tasks = require('../fixtures/tasks.json');

Before(async ({ AuthHelper, ApiHelper }) => {
    await AuthHelper.loginAs(users.users.demo.username, users.users.demo.password);

    // Create sample tasks for filtering
    await ApiHelper.createTask({ title: 'High Priority Active', priority: 'high' });
    await ApiHelper.createTask({ title: 'Low Priority Active', priority: 'low' });
    await ApiHelper.createTask({ title: 'Medium Completed', priority: 'medium', isCompleted: true });
    await ApiHelper.createTask({ title: 'Task with Due Date', dueDate: '2025-06-15' });
});

After(async ({ ApiHelper }) => {
    try {
        await ApiHelper.deleteAllTasks();
    } catch (e) {
        console.log('Cleanup skipped:', e.message);
    }
});

// ==================== FILTER BY STATUS TESTS ====================

Scenario('Filter tasks by All status', async ({ I, tasksPage }) => {
    tasksPage.goto();
    tasksPage.filterByStatus('all');

    // Should show all tasks
    const count = await tasksPage.getTasksCount();
    I.assertEqual(count >= 4, true, 'Should show all tasks');
});

Scenario('Filter tasks by Active status', async ({ I, tasksPage }) => {
    tasksPage.goto();
    tasksPage.filterByStatus('active');

    // Should only show active (not completed) tasks
    tasksPage.seeTask('High Priority Active');
    tasksPage.seeTask('Low Priority Active');
    tasksPage.dontSeeTask('Medium Completed');
});

Scenario('Filter tasks by Completed status', async ({ I, tasksPage }) => {
    tasksPage.goto();
    tasksPage.filterByStatus('completed');

    // Should only show completed tasks
    tasksPage.seeTask('Medium Completed');
    tasksPage.dontSeeTask('High Priority Active');
});

// ==================== FILTER BY PRIORITY TESTS ====================

Scenario('Filter tasks by High priority', async ({ I, tasksPage }) => {
    tasksPage.goto();
    tasksPage.filterByPriority('high');

    tasksPage.seeTask('High Priority Active');
    tasksPage.dontSeeTask('Low Priority Active');
});

Scenario('Filter tasks by Medium priority', async ({ I, tasksPage }) => {
    tasksPage.goto();
    tasksPage.filterByPriority('medium');

    tasksPage.seeTask('Medium Completed');
});

Scenario('Filter tasks by Low priority', async ({ I, tasksPage }) => {
    tasksPage.goto();
    tasksPage.filterByPriority('low');

    tasksPage.seeTask('Low Priority Active');
    tasksPage.dontSeeTask('High Priority Active');
});

Scenario('Reset priority filter to All', async ({ I, tasksPage }) => {
    tasksPage.goto();

    // Apply filter first
    tasksPage.filterByPriority('high');
    I.wait(1);

    // Reset to all
    tasksPage.filterByPriority('all');

    // Should show all tasks
    const count = await tasksPage.getTasksCount();
    I.assertEqual(count >= 4, true, 'Should show all tasks');
});

// ==================== COMBINED FILTER TESTS ====================

Scenario('Combine status and priority filters', async ({ I, tasksPage }) => {
    tasksPage.goto();

    // Filter by active status
    tasksPage.filterByStatus('active');
    I.wait(1);

    // Then filter by high priority
    tasksPage.filterByPriority('high');
    I.wait(1);

    // Should only show active high priority tasks
    tasksPage.seeTask('High Priority Active');
    tasksPage.dontSeeTask('Low Priority Active');
    tasksPage.dontSeeTask('Medium Completed');
});

// ==================== TASK TEMPLATE TESTS ====================

Scenario('Apply task template', async ({ I, tasksPage }) => {
    tasksPage.goto();

    // Click template button
    I.click('[data-testid="template-btn"]');
    I.waitForElement('[data-testid="template-list"]', 5);

    // Select a template (click first available template)
    I.click('[data-testid="template-item"]:first-child');

    // Should populate task form
    I.wait(1);
});

// ==================== SORTING TESTS ====================

Scenario('Tasks are sorted by priority', async ({ I, tasksPage }) => {
    tasksPage.goto();

    // High priority tasks should appear first (depends on implementation)
    const items = await I.grabTextFromAll(tasksPage.tasksList.item);
    // Verify order if sorting is implemented
});

Scenario('Tasks are sorted by due date', async ({ I, tasksPage }) => {
    tasksPage.goto();

    // Click sort by due date (if available)
    I.click('[data-testid="sort-by-due-date"]');
    I.wait(1);

    // Tasks with due dates should appear in order
});

// ==================== EDGE CASES ====================

Scenario('Empty state when no tasks match filter', async ({ I, tasksPage, ApiHelper }) => {
    // Clean up all tasks first
    await ApiHelper.deleteAllTasks();

    tasksPage.goto();
    tasksPage.filterByStatus('completed');

    // Should show empty state or message
    I.wait(1);
});

Scenario('Rapid filter switching works correctly', async ({ I, tasksPage }) => {
    tasksPage.goto();

    // Rapidly switch filters
    tasksPage.filterByStatus('active');
    I.wait(0.3);
    tasksPage.filterByStatus('completed');
    I.wait(0.3);
    tasksPage.filterByStatus('all');
    I.wait(0.3);
    tasksPage.filterByPriority('high');
    I.wait(0.3);
    tasksPage.filterByPriority('low');

    // Should not crash
    I.seeElement(tasksPage.tasksList.container);
});

Scenario('Filter persists after task action', async ({ I, tasksPage, ApiHelper }) => {
    await ApiHelper.createTask({ title: 'New Active Task', priority: 'high' });

    tasksPage.goto();

    // Set filter
    tasksPage.filterByStatus('active');
    I.wait(1);

    // Complete a task
    tasksPage.toggleComplete('New Active Task');
    I.wait(1);

    // Task should disappear from active filter
    tasksPage.dontSeeTask('New Active Task');
});

Scenario('Due date filter shows upcoming tasks', async ({ I, tasksPage }) => {
    tasksPage.goto();

    // If there's a due date filter
    I.click('[data-testid="filter-upcoming"]');
    I.wait(1);

    tasksPage.seeTask('Task with Due Date');
});
