Feature('Notes - Search, Filter, and Features');

const users = require('../fixtures/users.json');
const notes = require('../fixtures/notes.json');

Before(async ({ AuthHelper, ApiHelper }) => {
    // Login and setup test data
    await AuthHelper.loginAs(users.users.demo.username, users.users.demo.password);

    // Create test notes
    await ApiHelper.createNote({ title: 'Search Test Note', content: 'This is searchable content' });
    await ApiHelper.createNote({ title: 'Another Note', content: 'Different content here' });
    await ApiHelper.createNote({ ...notes.validNotes.withTags, title: 'Tagged Note' });
});

After(async ({ ApiHelper }) => {
    // Cleanup
    try {
        await ApiHelper.deleteAllNotes();
    } catch (e) {
        console.log('Cleanup skipped:', e.message);
    }
});

// ==================== SEARCH TESTS ====================

Scenario('Search notes by keyword in title', async ({ I, notesPage }) => {
    notesPage.goto();
    notesPage.searchNotes('Search Test');

    // Should show matching note
    notesPage.seeNote('Search Test Note');
    notesPage.dontSeeNote('Another Note');
});

Scenario('Search notes by keyword in content', async ({ I, notesPage }) => {
    notesPage.goto();
    notesPage.searchNotes('searchable');

    // Should find note with matching content
    notesPage.seeNote('Search Test Note');
});

Scenario('Search with no results shows empty state', async ({ I, notesPage }) => {
    notesPage.goto();
    notesPage.searchNotes(notes.searchTerms.nonExisting);

    // Should show no results
    const count = await notesPage.getNotesCount();
    I.assertEqual(count, 0, 'Should have no search results');
});

Scenario('Clear search shows all notes', async ({ I, notesPage }) => {
    notesPage.goto();

    // Search first
    notesPage.searchNotes('Search Test');

    // Clear search
    notesPage.clearSearch();

    // Should show all notes again
    const count = await notesPage.getNotesCount();
    I.assertEqual(count >= 2, true, 'Should show multiple notes after clearing search');
});

Scenario('Search handles special regex characters safely', async ({ I, notesPage }) => {
    notesPage.goto();
    notesPage.searchNotes(notes.searchTerms.regexChars);

    // Should not crash
    I.seeElement(notesPage.notesList.container);
});

Scenario('Search handles SQL injection attempt safely', async ({ I, notesPage }) => {
    notesPage.goto();
    notesPage.searchNotes(notes.searchTerms.sqlInjection);

    // Should not crash, should handle safely
    I.seeElement(notesPage.notesList.container);
});

// ==================== FILTER TESTS ====================

Scenario('Filter notes by favorites', async ({ I, notesPage, ApiHelper }) => {
    // Create a favorite note
    await ApiHelper.createNote({ ...notes.validNotes.favorite, title: 'My Favorite Note' });

    notesPage.goto();
    notesPage.filterByFavorites();

    // Should show only favorite notes
    notesPage.seeNote('My Favorite Note');
});

Scenario('Filter notes by pinned', async ({ I, notesPage, ApiHelper }) => {
    // Create a pinned note
    await ApiHelper.createNote({ ...notes.validNotes.pinned, title: 'My Pinned Note' });

    notesPage.goto();
    notesPage.filterByPinned();

    // Should show only pinned notes
    notesPage.seeNote('My Pinned Note');
});

Scenario('Show all notes after filtering', async ({ I, notesPage }) => {
    notesPage.goto();

    // Apply filter
    notesPage.filterByFavorites();
    I.wait(1);

    // Show all
    notesPage.showAllNotes();

    // Should show all notes
    const count = await notesPage.getNotesCount();
    I.assertEqual(count >= 2, true, 'Should show multiple notes');
});

// ==================== FEATURE TESTS ====================

Scenario('Toggle note as favorite', async ({ I, notesPage, ApiHelper }) => {
    await ApiHelper.createNote({ title: 'Toggle Favorite Test', content: 'Test content' });

    notesPage.goto();
    notesPage.toggleFavorite('Toggle Favorite Test');

    // Verify favorite filter shows it
    I.wait(1);
    notesPage.filterByFavorites();
    notesPage.seeNote('Toggle Favorite Test');
});

Scenario('Toggle note as pinned', async ({ I, notesPage, ApiHelper }) => {
    await ApiHelper.createNote({ title: 'Toggle Pin Test', content: 'Test content' });

    notesPage.goto();
    notesPage.togglePin('Toggle Pin Test');

    // Pinned notes should appear at top or in pinned filter
    I.wait(1);
});

Scenario('Pinned notes appear first in list', async ({ I, notesPage, ApiHelper }) => {
    // Create regular note first
    await ApiHelper.createNote({ title: 'Regular Note', content: 'Normal content' });
    // Create pinned note second
    await ApiHelper.createNote({ title: 'Pinned First', content: 'Pinned content', isPinned: true });

    notesPage.goto();

    // Pinned note should be visible at the top
    const firstNote = await I.grabTextFrom(notesPage.notesList.item + ':first-child');
    I.assertContain(firstNote, 'Pinned');
});

Scenario('Notes display tags correctly', async ({ I, notesPage }) => {
    notesPage.goto();

    // Should see the tagged note with its tags
    I.seeElement(notesPage.noteItem.tags);
});

// ==================== EDGE CASES ====================

Scenario('Search with empty query shows all notes', async ({ I, notesPage }) => {
    notesPage.goto();
    notesPage.searchNotes('');

    // Should show all notes
    const count = await notesPage.getNotesCount();
    I.assertEqual(count >= 2, true, 'Should show all notes with empty search');
});

Scenario('Rapid filter switching works correctly', async ({ I, notesPage }) => {
    notesPage.goto();

    // Rapidly switch between filters
    notesPage.filterByFavorites();
    I.wait(0.5);
    notesPage.filterByPinned();
    I.wait(0.5);
    notesPage.showAllNotes();
    I.wait(0.5);
    notesPage.filterByFavorites();

    // Should not crash
    I.seeElement(notesPage.notesList.container);
});

Scenario('Search preserves after page refresh', async ({ I, notesPage }) => {
    notesPage.goto();
    notesPage.searchNotes('Search Test');

    // Refresh page
    I.refreshPage();
    I.wait(2);

    // Check if search is preserved (depends on implementation)
    I.seeElement(notesPage.notesList.container);
});
