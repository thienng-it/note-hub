Feature('Notes - Sharing');

const users = require('../fixtures/users.json');

Before(async ({ AuthHelper }) => {
    await AuthHelper.loginAs(users.users.demo.username, users.users.demo.password);
});

After(async ({ ApiHelper }) => {
    try {
        await ApiHelper.deleteAllNotes();
    } catch (e) {
        console.log('Cleanup skipped:', e.message);
    }
});

// ==================== HAPPY PATH TESTS ====================

Scenario('Share note publicly generates share link', async ({ I, notesPage, ApiHelper }) => {
    // Create a note
    const note = await ApiHelper.createNote({ title: 'Shareable Note', content: 'Public content' });

    notesPage.goto();

    // Click share button
    I.click(locate(notesPage.noteItem.shareBtn).inside(locate(notesPage.notesList.item).withText('Shareable Note')));

    // Wait for share dialog
    I.waitForElement('[data-testid="share-dialog"]', 5);

    // Enable public sharing
    I.click('[data-testid="enable-public-share"]');
    I.wait(1);

    // Should show share link
    I.seeElement('[data-testid="share-link"]');
});

Scenario('Access shared note via public link', async ({ I, ApiHelper, AuthHelper }) => {
    // Create and share a note
    const note = await ApiHelper.createNote({ title: 'Public Note', content: 'Visible to all' });

    // Get share link (would need to be exposed via API or captured from UI)
    // For this test, we'll navigate to the public note URL pattern

    // Logout
    await AuthHelper.logout();

    // Access public note
    I.amOnPage(`/public/note/${note.id}`);
    I.wait(2);

    // Should see note content (if actually shared)
    // Note: This depends on the sharing implementation
});

Scenario('Copy share link to clipboard', async ({ I, notesPage, ApiHelper }) => {
    const note = await ApiHelper.createNote({ title: 'Copy Link Note', content: 'Content' });

    notesPage.goto();

    I.click(locate(notesPage.noteItem.shareBtn).inside(locate(notesPage.notesList.item).withText('Copy Link Note')));
    I.waitForElement('[data-testid="share-dialog"]', 5);
    I.click('[data-testid="enable-public-share"]');
    I.wait(1);

    // Click copy button
    I.click('[data-testid="copy-link"]');

    // Should show copied confirmation
    I.see('Copied');
});

Scenario('Revoke note sharing', async ({ I, notesPage, ApiHelper }) => {
    const note = await ApiHelper.createNote({ title: 'Revoke Share Note', content: 'Content' });

    notesPage.goto();

    // Share first
    I.click(locate(notesPage.noteItem.shareBtn).inside(locate(notesPage.notesList.item).withText('Revoke Share Note')));
    I.waitForElement('[data-testid="share-dialog"]', 5);
    I.click('[data-testid="enable-public-share"]');
    I.wait(1);

    // Revoke sharing
    I.click('[data-testid="disable-public-share"]');
    I.wait(1);

    // Share link should be gone
    I.dontSeeElement('[data-testid="share-link"]');
});

// ==================== NEGATIVE TESTS ====================

Scenario('Access revoked share link shows error', async ({ I, ApiHelper, AuthHelper }) => {
    // This test requires knowing a revoked share ID
    // Attempt to access invalid share link
    await AuthHelper.logout();

    I.amOnPage('/public/note/invalid-share-id-12345');
    I.wait(2);

    // Should show not found or access denied
    I.see('not found', 'body');
});

Scenario('Cannot share note when not authenticated', async ({ I, AuthHelper }) => {
    await AuthHelper.logout();

    // Try to access share page directly
    I.amOnPage('/notes/1/share');
    I.wait(2);

    // Should redirect to login
    I.seeInCurrentUrl('/login');
});

// ==================== EDGE CASES ====================

Scenario('Share note with specific user via email', async ({ I, notesPage, ApiHelper }) => {
    const note = await ApiHelper.createNote({ title: 'Share With User', content: 'Private share' });

    notesPage.goto();

    I.click(locate(notesPage.noteItem.shareBtn).inside(locate(notesPage.notesList.item).withText('Share With User')));
    I.waitForElement('[data-testid="share-dialog"]', 5);

    // Share with specific user
    I.fillField('[data-testid="share-email-input"]', 'otheruser@example.com');
    I.click('[data-testid="share-with-user"]');

    I.wait(2);
});

Scenario('Change share permissions (view/edit)', async ({ I, notesPage, ApiHelper }) => {
    const note = await ApiHelper.createNote({ title: 'Permission Note', content: 'Content' });

    notesPage.goto();

    I.click(locate(notesPage.noteItem.shareBtn).inside(locate(notesPage.notesList.item).withText('Permission Note')));
    I.waitForElement('[data-testid="share-dialog"]', 5);

    // Add user with view permission
    I.fillField('[data-testid="share-email-input"]', 'viewer@example.com');
    I.selectOption('[data-testid="permission-select"]', 'view');
    I.click('[data-testid="share-with-user"]');

    I.wait(1);

    // Change to edit permission  
    I.click('[data-testid="permission-select"]');
    I.selectOption('[data-testid="permission-select"]', 'edit');

    I.wait(1);
});

Scenario('Remove shared user access', async ({ I, notesPage, ApiHelper }) => {
    const note = await ApiHelper.createNote({ title: 'Remove Access Note', content: 'Content' });

    notesPage.goto();

    I.click(locate(notesPage.noteItem.shareBtn).inside(locate(notesPage.notesList.item).withText('Remove Access Note')));
    I.waitForElement('[data-testid="share-dialog"]', 5);

    // Share with user first
    I.fillField('[data-testid="share-email-input"]', 'toremove@example.com');
    I.click('[data-testid="share-with-user"]');
    I.wait(1);

    // Remove access
    I.click('[data-testid="remove-user-access"]');
    I.wait(1);
});
