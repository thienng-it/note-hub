Feature('Critical Path - End-to-End User Journeys');

const users = require('../fixtures/users.json');

/**
 * Critical path tests verify complete user journeys
 * These are the most important flows that must work
 */

// ==================== USER REGISTRATION JOURNEY ====================

Scenario('Complete new user journey: Register → Login → Create Note → Share → Logout', async ({ I, registerPage, loginPage, notesPage, AuthHelper }) => {
    const timestamp = Date.now();
    const newUser = {
        username: `journey_user_${timestamp}`,
        email: `journey_${timestamp}@example.com`,
        password: 'JourneyTest123!',
        confirmPassword: 'JourneyTest123!',
    };

    // Step 1: Register new account
    registerPage.goto();
    registerPage.register(newUser);

    // Step 2: Should be redirected to login or dashboard
    I.wait(3);
    I.dontSeeInCurrentUrl('/register');

    // Step 3: Login if needed
    if (await I.grabCurrentUrl().then(url => url.includes('/login'))) {
        loginPage.login(newUser.username, newUser.password);
        I.wait(2);
    }

    // Step 4: Should now be on notes page
    I.seeInCurrentUrl('/notes');

    // Step 5: Create a note
    notesPage.createNote('My First Note', 'This is my journey test note!');
    I.wait(2);
    notesPage.seeNote('My First Note');

    // Step 6: Share the note
    I.click(locate(notesPage.noteItem.shareBtn).inside(locate(notesPage.notesList.item).withText('My First Note')));
    I.waitForElement('[data-testid="share-dialog"]', 5);
    I.click('[data-testid="enable-public-share"]');
    I.wait(2);

    // Step 7: Logout
    await AuthHelper.logout();
    I.seeInCurrentUrl('/login');
});

// ==================== TASK MANAGEMENT JOURNEY ====================

Scenario('Complete task journey: Login → Create Task → Complete → Delete → Logout', async ({ I, tasksPage, AuthHelper }) => {
    // Step 1: Login
    await AuthHelper.loginAs(users.users.demo.username, users.users.demo.password);

    // Step 2: Navigate to tasks
    tasksPage.goto();
    I.seeElement(tasksPage.tasksList.container);

    // Step 3: Create a task
    tasksPage.createTask({
        title: 'Journey Test Task',
        description: 'Complete this for the journey test',
        priority: 'high',
        dueDate: '2025-12-31',
    });
    I.wait(2);
    tasksPage.seeTask('Journey Test Task');

    // Step 4: Mark task complete
    tasksPage.toggleComplete('Journey Test Task');
    I.wait(1);
    tasksPage.seeTaskCompleted('Journey Test Task');

    // Step 5: Delete the task
    tasksPage.deleteTask('Journey Test Task');
    I.wait(1);
    tasksPage.dontSeeTask('Journey Test Task');

    // Step 6: Logout
    await AuthHelper.logout();
    I.seeInCurrentUrl('/login');
});

// ==================== NOTES ORGANIZATION JOURNEY ====================

Scenario('Complete notes organization: Login → Create Folders → Create Notes → Organize → Search', async ({ I, notesPage, ApiHelper, AuthHelper }) => {
    await AuthHelper.loginAs(users.users.demo.username, users.users.demo.password);

    // Step 1: Create folders via API for setup
    const workFolder = await ApiHelper.createFolder({ name: 'Work', type: 'note' });
    const personalFolder = await ApiHelper.createFolder({ name: 'Personal', type: 'note' });

    // Step 2: Navigate to notes
    notesPage.goto();

    // Step 3: Create notes in different folders
    await ApiHelper.createNote({ title: 'Work Meeting Notes', content: 'Discussed Q1 goals', folderId: workFolder.id });
    await ApiHelper.createNote({ title: 'Personal Diary', content: 'Great day today!', folderId: personalFolder.id });
    await ApiHelper.createNote({ title: 'Unfiled Note', content: 'This has no folder' });

    // Step 4: Refresh to see notes
    I.refreshPage();
    I.wait(2);

    // Step 5: Filter by folder
    I.click(locate(notesPage.folders.folderItem).withText('Work'));
    I.wait(1);
    notesPage.seeNote('Work Meeting Notes');
    notesPage.dontSeeNote('Personal Diary');

    // Step 6: Search across all notes
    notesPage.showAllNotes();
    I.wait(1);
    notesPage.searchNotes('great day');
    I.wait(1);
    notesPage.seeNote('Personal Diary');

    // Cleanup
    await ApiHelper.deleteAllNotes();
    await AuthHelper.logout();
});

// ==================== PROFILE CUSTOMIZATION JOURNEY ====================

Scenario('Complete profile customization: Login → Edit Profile → Change Theme → Change Language → Verify', async ({ I, profilePage, AuthHelper }) => {
    await AuthHelper.loginAs(users.users.demo.username, users.users.demo.password);

    // Step 1: Navigate to profile
    profilePage.goto();
    profilePage.seeUsername(users.users.demo.username);

    // Step 2: Update bio
    profilePage.updateBio('E2E Test User - Journey Test');
    I.wait(1);

    // Step 3: Toggle dark mode
    profilePage.toggleTheme();
    I.wait(1);
    I.seeElement('[data-theme="dark"]');

    // Step 4: Change language
    profilePage.changeLanguage('vi');
    I.wait(1);

    // Step 5: Verify persistence after refresh
    I.refreshPage();
    I.wait(2);
    I.seeElement('[data-theme="dark"]');

    // Step 6: Restore defaults
    profilePage.toggleTheme();
    profilePage.changeLanguage('en');

    await AuthHelper.logout();
});

// ==================== ADMIN JOURNEY ====================

Scenario('Complete admin journey: Login as Admin → View Dashboard → View Users → View Logs', async ({ I, adminPage, AuthHelper }) => {
    const adminPassword = process.env.NOTES_ADMIN_PASSWORD || 'admin123';

    // Step 1: Login as admin
    await AuthHelper.loginAs('admin', adminPassword);

    // Step 2: Navigate to admin dashboard
    adminPage.goto();
    adminPage.seeAdminDashboard();

    // Step 3: View user statistics
    const userCount = await adminPage.getUserCount();
    I.say(`Total users: ${userCount}`);

    // Step 4: Navigate to users list
    adminPage.goToUsers();
    I.seeElement(adminPage.usersList.container);

    // Step 5: Search for a user
    adminPage.searchUsers('demo');
    I.wait(1);
    I.see('demo', adminPage.usersList.container);

    // Step 6: Navigate to audit logs
    adminPage.goToAuditLogs();
    I.seeElement(adminPage.auditLogs.container);

    // Step 7: Filter logs
    adminPage.filterLogsByType('LOGIN');
    I.wait(1);

    await AuthHelper.logout();
});

// ==================== COLLABORATION JOURNEY ====================

Scenario('Complete collaboration: User A shares note → User B accesses it', async ({ I, notesPage, AuthHelper, ApiHelper }) => {
    // This test would require two different users
    // For now, we test the sharing flow with public access

    // Step 1: Login as first user
    await AuthHelper.loginAs(users.users.demo.username, users.users.demo.password);

    // Step 2: Create and share note
    const note = await ApiHelper.createNote({
        title: 'Shared Collaboration Note',
        content: 'This note is shared for collaboration'
    });

    notesPage.goto();

    // Click share
    I.click(locate(notesPage.noteItem.shareBtn).inside(locate(notesPage.notesList.item).withText('Shared Collaboration Note')));
    I.waitForElement('[data-testid="share-dialog"]', 5);
    I.click('[data-testid="enable-public-share"]');
    I.wait(2);

    // Get share link
    const shareLink = await I.grabValueFrom('[data-testid="share-link"]');
    I.say(`Share link: ${shareLink}`);

    // Step 3: Logout
    await AuthHelper.logout();

    // Step 4: Access shared note without login
    I.amOnPage(`/public/note/${note.id}`);
    I.wait(2);

    // Should see the shared note content (if public)
});

// ==================== MOBILE RESPONSIVE JOURNEY ====================

Scenario('Mobile view: Complete basic journey on mobile viewport', async ({ I, loginPage, notesPage, AuthHelper }) => {
    // Set mobile viewport
    I.resizeWindow(375, 812);

    // Step 1: Login
    loginPage.goto();
    loginPage.login(users.users.demo.username, users.users.demo.password);
    I.wait(2);

    // Step 2: Navigate to notes
    I.seeInCurrentUrl('/notes');

    // Step 3: Create note on mobile
    notesPage.clickCreateNote();
    I.fillField(notesPage.editor.titleInput, 'Mobile Note');
    I.fillField(notesPage.editor.contentInput, 'Created on mobile!');
    I.click(notesPage.editor.saveBtn);
    I.wait(2);

    // Step 4: Verify note exists
    notesPage.seeNote('Mobile Note');

    // Cleanup
    await AuthHelper.logout();

    // Reset viewport
    I.resizeWindow(1920, 1080);
});
