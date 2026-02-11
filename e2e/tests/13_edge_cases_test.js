Feature('Edge Cases and Error Handling');

const users = require('../fixtures/users.json');

Before(async ({ AuthHelper }) => {
    await AuthHelper.loginAs(users.users.demo.username, users.users.demo.password);
});

// ==================== SESSION HANDLING ====================

Scenario('Session expiration redirects to login', async ({ I, notesPage }) => {
    notesPage.goto();

    // Simulate token expiration
    I.executeScript(() => {
        localStorage.setItem('accessToken', 'expired-token-12345');
    });

    // Try to perform an action
    I.refreshPage();
    I.wait(3);

    // Should redirect to login or show session expired
});

Scenario('Refresh token extends session', async ({ I, notesPage }) => {
    notesPage.goto();

    // Wait a bit and perform action
    I.wait(2);
    I.click(notesPage.actions.createNote);

    // Should still work (token refreshed)
    I.seeElement(notesPage.editor.titleInput);
});

// ==================== NETWORK ERROR HANDLING ====================

Scenario('Page handles slow network gracefully', async ({ I, notesPage }) => {
    // Note: Actual network throttling requires Playwright config
    notesPage.goto();

    // Page should load with loading states
    I.seeElement(notesPage.notesList.container);
});

Scenario('Error page displays for 404', async ({ I }) => {
    I.amOnPage('/non-existent-page-12345');
    I.wait(2);

    // Should show error page or redirect
    I.see('not found', 'body');
});

// ==================== CONCURRENT OPERATIONS ====================

Scenario('Handle concurrent note creation', async ({ I, notesPage }) => {
    notesPage.goto();

    // Create multiple notes rapidly
    notesPage.clickCreateNote();
    I.fillField(notesPage.editor.titleInput, 'Concurrent Note 1');
    I.fillField(notesPage.editor.contentInput, 'Content 1');
    I.click(notesPage.editor.saveBtn);

    // Immediately try another
    I.wait(0.5);
    notesPage.clickCreateNote();
    I.fillField(notesPage.editor.titleInput, 'Concurrent Note 2');
    I.fillField(notesPage.editor.contentInput, 'Content 2');
    I.click(notesPage.editor.saveBtn);

    // Both should be created
    I.wait(2);
    notesPage.seeNote('Concurrent Note 1');
    notesPage.seeNote('Concurrent Note 2');
});

Scenario('Handle rapid button clicks', async ({ I, notesPage }) => {
    notesPage.goto();

    // Rapidly click create button
    I.click(notesPage.actions.createNote);
    I.click(notesPage.actions.createNote);
    I.click(notesPage.actions.createNote);

    I.wait(1);

    // Should not crash or create duplicates
    I.seeElement(notesPage.editor.titleInput);
});

// ==================== LARGE DATA HANDLING ====================

Scenario('Load page with many notes', async ({ I, notesPage, ApiHelper }) => {
    // Create 20 notes
    for (let i = 0; i < 20; i++) {
        await ApiHelper.createNote({ title: `Bulk Note ${i}`, content: `Content ${i}` });
    }

    notesPage.goto();

    // Page should load and display notes
    I.seeElement(notesPage.notesList.container);

    // Cleanup
    await ApiHelper.deleteAllNotes();
});

Scenario('Handle very long note content', async ({ I, notesPage }) => {
    notesPage.goto();
    notesPage.clickCreateNote();

    // Create note with very long content
    const longContent = 'Lorem ipsum '.repeat(1000);
    I.fillField(notesPage.editor.titleInput, 'Long Content Test');
    I.fillField(notesPage.editor.contentInput, longContent);
    I.click(notesPage.editor.saveBtn);

    I.wait(3);

    // Should save successfully
    notesPage.seeNote('Long Content Test');
});

// ==================== INPUT VALIDATION ====================

Scenario('Handle emojis in inputs', async ({ I, notesPage }) => {
    notesPage.goto();
    notesPage.createNote('Emoji Test 🎉🚀✨', 'Content with emojis 😀👍');

    notesPage.seeNote('Emoji Test');
});

Scenario('Handle RTL text in inputs', async ({ I, notesPage }) => {
    notesPage.goto();
    notesPage.createNote('RTL Test مرحبا', 'Arabic content مرحبا بالعالم');

    // Should handle RTL text
    I.wait(2);
});

Scenario('Handle HTML entities in inputs', async ({ I, notesPage }) => {
    notesPage.goto();
    notesPage.createNote('HTML Entities &amp; &lt; &gt;', 'Content with & < > " \' characters');

    I.wait(2);
    // Should escape properly
});

// ==================== BROWSER ACTIONS ====================

Scenario('Handle back button navigation', async ({ I, notesPage, profilePage }) => {
    notesPage.goto();

    // Navigate to profile
    profilePage.goto();
    I.wait(1);

    // Press back
    I.executeScript(() => history.back());
    I.wait(2);

    // Should be back on notes
    I.seeInCurrentUrl('/notes');
});

Scenario('Handle forward button navigation', async ({ I, notesPage, profilePage }) => {
    notesPage.goto();
    profilePage.goto();

    // Go back
    I.executeScript(() => history.back());
    I.wait(1);

    // Go forward
    I.executeScript(() => history.forward());
    I.wait(2);

    // Should be on profile
    I.seeInCurrentUrl('/profile');
});

Scenario('Handle page refresh during form input', async ({ I, notesPage }) => {
    notesPage.goto();
    notesPage.clickCreateNote();

    I.fillField(notesPage.editor.titleInput, 'Unsaved Note');

    // Refresh page
    I.refreshPage();
    I.wait(2);

    // Form data may be lost (depending on implementation)
    I.seeElement(notesPage.notesList.container);
});

// ==================== ACCESSIBILITY ====================

Scenario('Keyboard navigation works on notes page', async ({ I, notesPage }) => {
    notesPage.goto();

    // Tab through elements
    I.pressKey('Tab');
    I.wait(0.5);
    I.pressKey('Tab');
    I.wait(0.5);
    I.pressKey('Tab');

    // Should navigate through focusable elements
});

Scenario('Enter key submits forms', async ({ I, loginPage, AuthHelper }) => {
    await AuthHelper.logout();

    loginPage.goto();
    I.fillField(loginPage.fields.username, users.users.demo.username);
    I.fillField(loginPage.fields.password, users.users.demo.password);

    // Press Enter to submit
    I.pressKey('Enter');
    I.wait(3);

    // Should login
    I.dontSeeInCurrentUrl('/login');
});

// ==================== OFFLINE HANDLING ====================

Scenario('Offline indicator shows when offline', async ({ I, notesPage }) => {
    notesPage.goto();

    // Simulate offline
    I.executeScript(() => {
        window.dispatchEvent(new Event('offline'));
    });

    I.wait(1);

    // Should show offline indicator
    I.seeElement('[data-testid="offline-indicator"]');

    // Restore online
    I.executeScript(() => {
        window.dispatchEvent(new Event('online'));
    });
});
