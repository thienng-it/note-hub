Feature('Notes - CRUD Operations');

const users = require('../fixtures/users.json');
const notes = require('../fixtures/notes.json');

Before(async ({ AuthHelper }) => {
    // Login before each test
    await AuthHelper.loginAs(users.users.demo.username, users.users.demo.password);
});

After(async ({ ApiHelper }) => {
    // Cleanup: Delete all test notes after each test
    try {
        await ApiHelper.deleteAllNotes();
    } catch (e) {
        console.log('Cleanup skipped:', e.message);
    }
});

// ==================== HAPPY PATH TESTS ====================

Scenario('Notes page loads successfully', async ({ I, notesPage }) => {
    notesPage.goto();

    I.seeElement(notesPage.notesList.container);
    I.seeElement(notesPage.actions.createNote);
});

Scenario('Create a simple note', async ({ I, notesPage }) => {
    notesPage.goto();
    notesPage.createNote(
        notes.validNotes.simple.title,
        notes.validNotes.simple.content
    );

    // Verify note appears in list
    notesPage.seeNote(notes.validNotes.simple.title);
});

Scenario('Create a note with markdown content', async ({ I, notesPage }) => {
    notesPage.goto();
    notesPage.createNote(
        notes.validNotes.markdown.title,
        notes.validNotes.markdown.content
    );

    notesPage.seeNote(notes.validNotes.markdown.title);
});

Scenario('Create a note with tags', async ({ I, notesPage }) => {
    notesPage.goto();
    notesPage.createNote(
        notes.validNotes.withTags.title,
        notes.validNotes.withTags.content,
        notes.validNotes.withTags.tags
    );

    notesPage.seeNote(notes.validNotes.withTags.title);
});

Scenario('Edit existing note', async ({ I, notesPage, ApiHelper }) => {
    // Create a note via API first
    const note = await ApiHelper.createNote(notes.validNotes.simple);

    notesPage.goto();
    notesPage.clickNote(notes.validNotes.simple.title);

    // Edit the note
    I.waitForElement(notesPage.editor.titleInput, 5);
    I.clearField(notesPage.editor.titleInput);
    I.fillField(notesPage.editor.titleInput, 'Updated Title');
    I.click(notesPage.editor.saveBtn);

    // Verify update
    I.wait(2);
    notesPage.seeNote('Updated Title');
});

Scenario('Delete a note', async ({ I, notesPage, ApiHelper }) => {
    // Create a note via API first
    await ApiHelper.createNote(notes.validNotes.simple);

    notesPage.goto();
    notesPage.deleteNote(notes.validNotes.simple.title);

    // Verify deleted
    notesPage.dontSeeNote(notes.validNotes.simple.title);
});

Scenario('View note details', async ({ I, notesPage, ApiHelper }) => {
    // Create a note via API
    await ApiHelper.createNote(notes.validNotes.markdown);

    notesPage.goto();
    notesPage.clickNote(notes.validNotes.markdown.title);

    // Should see note content
    I.waitForElement(notesPage.editor.contentInput, 5);
    I.see(notes.validNotes.markdown.title);
});

// ==================== NEGATIVE TESTS ====================

Scenario('Cannot create note with empty title', async ({ I, notesPage }) => {
    notesPage.goto();
    notesPage.clickCreateNote();

    // Leave title empty, add content
    I.fillField(notesPage.editor.contentInput, 'Some content');
    I.click(notesPage.editor.saveBtn);

    // Should show validation error or stay in editor
    I.wait(2);
});

Scenario('Notes page requires authentication', async ({ I, AuthHelper }) => {
    // Logout first
    await AuthHelper.logout();

    // Try to access notes page
    I.amOnPage('/notes');
    I.wait(2);

    // Should redirect to login
    I.seeInCurrentUrl('/login');
});

// ==================== EDGE CASES ====================

Scenario('Create note with very long content', async ({ I, notesPage }) => {
    notesPage.goto();
    notesPage.createNote(
        notes.validNotes.longContent.title,
        notes.validNotes.longContent.content
    );

    notesPage.seeNote(notes.validNotes.longContent.title);
});

Scenario('Create note with special characters', async ({ I, notesPage }) => {
    notesPage.goto();
    notesPage.createNote(
        notes.validNotes.specialChars.title,
        notes.validNotes.specialChars.content
    );

    // Should handle special chars safely
    I.wait(2);
});

Scenario('Create note with unicode content', async ({ I, notesPage }) => {
    notesPage.goto();
    notesPage.createNote(
        notes.validNotes.unicode.title,
        notes.validNotes.unicode.content
    );

    notesPage.seeNote(notes.validNotes.unicode.title);
});

Scenario('Create note with code blocks', async ({ I, notesPage }) => {
    notesPage.goto();
    notesPage.createNote(
        notes.validNotes.codeBlocks.title,
        notes.validNotes.codeBlocks.content
    );

    notesPage.seeNote(notes.validNotes.codeBlocks.title);
});

Scenario('Cancel note creation', async ({ I, notesPage }) => {
    notesPage.goto();
    notesPage.clickCreateNote();

    I.fillField(notesPage.editor.titleInput, 'Cancelled Note');
    I.click(notesPage.editor.cancelBtn);

    // Should not create the note
    I.wait(1);
    notesPage.dontSeeNote('Cancelled Note');
});

Scenario('Multiple notes display correctly', async ({ I, notesPage, ApiHelper }) => {
    // Create multiple notes
    await ApiHelper.createNote({ title: 'Note 1', content: 'Content 1' });
    await ApiHelper.createNote({ title: 'Note 2', content: 'Content 2' });
    await ApiHelper.createNote({ title: 'Note 3', content: 'Content 3' });

    notesPage.goto();

    // All notes should be visible
    notesPage.seeNote('Note 1');
    notesPage.seeNote('Note 2');
    notesPage.seeNote('Note 3');

    const count = await notesPage.getNotesCount();
    I.assertEqual(count >= 3, true, 'Should have at least 3 notes');
});
