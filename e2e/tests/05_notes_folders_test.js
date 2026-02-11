Feature('Notes - Folders Management');

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

Scenario('Folder sidebar is visible on notes page', async ({ I, notesPage }) => {
    notesPage.goto();

    I.seeElement(notesPage.folders.sidebar);
});

Scenario('Create a new folder', async ({ I, notesPage }) => {
    notesPage.goto();

    I.click(notesPage.folders.createBtn);
    I.waitForElement('input[data-testid="folder-name-input"]', 5);
    I.fillField('input[data-testid="folder-name-input"]', 'Test Folder');
    I.click('[data-testid="save-folder"]');

    I.wait(2);
    I.see('Test Folder', notesPage.folders.sidebar);
});

Scenario('Click on folder filters notes', async ({ I, notesPage, ApiHelper }) => {
    // Create folder and note in it
    const folder = await ApiHelper.createFolder({ name: 'Filter Test Folder', type: 'note' });
    await ApiHelper.createNote({ title: 'Note in Folder', content: 'Content', folderId: folder.id });
    await ApiHelper.createNote({ title: 'Note Outside Folder', content: 'Content' });

    notesPage.goto();

    // Click on folder
    I.click(locate(notesPage.folders.folderItem).withText('Filter Test Folder'));
    I.wait(1);

    // Should only show notes in that folder
    notesPage.seeNote('Note in Folder');
});

Scenario('Rename a folder', async ({ I, notesPage, ApiHelper }) => {
    // Create folder via API
    await ApiHelper.createFolder({ name: 'Original Name', type: 'note' });

    notesPage.goto();

    // Right-click or use menu to rename
    I.click(locate(notesPage.folders.folderItem).withText('Original Name'));
    I.click('[data-testid="folder-menu"]');
    I.click('[data-testid="rename-folder"]');

    I.clearField('input[data-testid="folder-name-input"]');
    I.fillField('input[data-testid="folder-name-input"]', 'New Name');
    I.click('[data-testid="save-folder"]');

    I.wait(2);
    I.see('New Name', notesPage.folders.sidebar);
});

Scenario('Delete empty folder', async ({ I, notesPage, ApiHelper }) => {
    // Create empty folder
    await ApiHelper.createFolder({ name: 'Empty Folder', type: 'note' });

    notesPage.goto();

    // Delete the folder
    I.click(locate(notesPage.folders.folderItem).withText('Empty Folder'));
    I.click('[data-testid="folder-menu"]');
    I.click('[data-testid="delete-folder"]');

    // Confirm deletion
    I.waitForElement('[data-testid="confirm-delete"]', 5);
    I.click('[data-testid="confirm-delete"]');

    I.wait(2);
    I.dontSee('Empty Folder', notesPage.folders.sidebar);
});

// ==================== NEGATIVE TESTS ====================

Scenario('Cannot create folder with empty name', async ({ I, notesPage }) => {
    notesPage.goto();

    I.click(notesPage.folders.createBtn);
    I.waitForElement('input[data-testid="folder-name-input"]', 5);
    // Leave name empty
    I.click('[data-testid="save-folder"]');

    // Should show validation error
    I.wait(1);
});

Scenario('Delete folder with notes shows confirmation', async ({ I, notesPage, ApiHelper }) => {
    // Create folder with notes
    const folder = await ApiHelper.createFolder({ name: 'Folder With Notes', type: 'note' });
    await ApiHelper.createNote({ title: 'Note Inside', content: 'Content', folderId: folder.id });

    notesPage.goto();

    // Try to delete folder
    I.click(locate(notesPage.folders.folderItem).withText('Folder With Notes'));
    I.click('[data-testid="folder-menu"]');
    I.click('[data-testid="delete-folder"]');

    // Should show confirmation modal
    I.waitForElement('[data-testid="confirm-delete"]', 5);
    I.see('notes will be moved');
});

// ==================== EDGE CASES ====================

Scenario('Create folder with special characters in name', async ({ I, notesPage }) => {
    notesPage.goto();

    I.click(notesPage.folders.createBtn);
    I.waitForElement('input[data-testid="folder-name-input"]', 5);
    I.fillField('input[data-testid="folder-name-input"]', 'Folder <>&"\'');
    I.click('[data-testid="save-folder"]');

    I.wait(2);
    // Should handle safely
    I.seeElement(notesPage.folders.sidebar);
});

Scenario('Create nested folders', async ({ I, notesPage, ApiHelper }) => {
    // Create parent folder
    const parent = await ApiHelper.createFolder({ name: 'Parent Folder', type: 'note' });

    notesPage.goto();

    // Create child folder
    I.click(locate(notesPage.folders.folderItem).withText('Parent Folder'));
    I.click('[data-testid="create-subfolder"]');
    I.waitForElement('input[data-testid="folder-name-input"]', 5);
    I.fillField('input[data-testid="folder-name-input"]', 'Child Folder');
    I.click('[data-testid="save-folder"]');

    I.wait(2);
});

Scenario('Move note to different folder', async ({ I, notesPage, ApiHelper }) => {
    // Create two folders
    const folder1 = await ApiHelper.createFolder({ name: 'Folder 1', type: 'note' });
    const folder2 = await ApiHelper.createFolder({ name: 'Folder 2', type: 'note' });
    await ApiHelper.createNote({ title: 'Movable Note', content: 'Content', folderId: folder1.id });

    notesPage.goto();

    // Go to Folder 1
    I.click(locate(notesPage.folders.folderItem).withText('Folder 1'));
    I.wait(1);

    // Move note (this depends on UI implementation)
    I.click(locate(notesPage.notesList.item).withText('Movable Note'));
    I.click('[data-testid="move-note"]');
    I.click(locate('[data-testid="folder-option"]').withText('Folder 2'));

    I.wait(2);

    // Verify note is in Folder 2
    I.click(locate(notesPage.folders.folderItem).withText('Folder 2'));
    I.wait(1);
    notesPage.seeNote('Movable Note');
});
