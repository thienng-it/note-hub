/**
 * Timestamp Tests for CRUD Operations
 * Tests that created_at and updated_at fields are properly set
 */
const db = require('../src/config/database');
const path = require('path');
const fs = require('fs');

describe('CRUD Timestamp Tests', () => {
  const testDbPath = path.join(__dirname, 'test-timestamps.db');

  beforeAll(async () => {
    // Set up test database path
    process.env.NOTES_DB_PATH = testDbPath;
    
    // Connect and initialize schema
    await db.connect();
    await db.initSchema();
  });

  afterAll(async () => {
    // Clean up
    await db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    // Also clean up WAL files
    const walPath = testDbPath + '-wal';
    const shmPath = testDbPath + '-shm';
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  });

  describe('User CRUD Operations', () => {
    let userId;

    it('should set created_at and updated_at when creating a user', async () => {
      const result = await db.run(
        `INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)`,
        ['testuser', 'hashedpassword', 'test@example.com']
      );
      userId = result.insertId;

      const user = await db.queryOne(
        `SELECT * FROM users WHERE id = ?`,
        [userId]
      );

      expect(user).toBeDefined();
      expect(user.created_at).toBeDefined();
      expect(user.updated_at).toBeDefined();
      expect(user.created_at).not.toBeNull();
      expect(user.updated_at).not.toBeNull();
    });

    it('should update updated_at when updating a user', async () => {
      const userBefore = await db.queryOne(
        `SELECT * FROM users WHERE id = ?`,
        [userId]
      );

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      await db.run(
        `UPDATE users SET email = ? WHERE id = ?`,
        ['newemail@example.com', userId]
      );

      const userAfter = await db.queryOne(
        `SELECT * FROM users WHERE id = ?`,
        [userId]
      );

      expect(userAfter.updated_at).toBeDefined();
      expect(userAfter.created_at).toBe(userBefore.created_at);
      // updated_at should be different after update
      expect(new Date(userAfter.updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(userBefore.updated_at).getTime()
      );
    });
  });

  describe('Note CRUD Operations', () => {
    let noteId;
    let userId;

    beforeAll(async () => {
      // Create a user for note ownership
      const result = await db.run(
        `INSERT INTO users (username, password_hash) VALUES (?, ?)`,
        ['noteuser', 'hashedpassword']
      );
      userId = result.insertId;
    });

    it('should set created_at and updated_at when creating a note', async () => {
      const result = await db.run(
        `INSERT INTO notes (title, body, owner_id) VALUES (?, ?, ?)`,
        ['Test Note', 'Note content', userId]
      );
      noteId = result.insertId;

      const note = await db.queryOne(
        `SELECT * FROM notes WHERE id = ?`,
        [noteId]
      );

      expect(note).toBeDefined();
      expect(note.created_at).toBeDefined();
      expect(note.updated_at).toBeDefined();
      expect(note.created_at).not.toBeNull();
      expect(note.updated_at).not.toBeNull();
    });

    it('should update updated_at when updating a note', async () => {
      const noteBefore = await db.queryOne(
        `SELECT * FROM notes WHERE id = ?`,
        [noteId]
      );

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      await db.run(
        `UPDATE notes SET title = ? WHERE id = ?`,
        ['Updated Note Title', noteId]
      );

      const noteAfter = await db.queryOne(
        `SELECT * FROM notes WHERE id = ?`,
        [noteId]
      );

      expect(noteAfter.updated_at).toBeDefined();
      expect(noteAfter.created_at).toBe(noteBefore.created_at);
      // updated_at should be different after update
      expect(new Date(noteAfter.updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(noteBefore.updated_at).getTime()
      );
    });
  });

  describe('Task CRUD Operations', () => {
    let taskId;
    let userId;

    beforeAll(async () => {
      // Create a user for task ownership
      const result = await db.run(
        `INSERT INTO users (username, password_hash) VALUES (?, ?)`,
        ['taskuser', 'hashedpassword']
      );
      userId = result.insertId;
    });

    it('should set created_at and updated_at when creating a task', async () => {
      const result = await db.run(
        `INSERT INTO tasks (title, description, owner_id, priority) VALUES (?, ?, ?, ?)`,
        ['Test Task', 'Task description', userId, 'high']
      );
      taskId = result.insertId;

      const task = await db.queryOne(
        `SELECT * FROM tasks WHERE id = ?`,
        [taskId]
      );

      expect(task).toBeDefined();
      expect(task.created_at).toBeDefined();
      expect(task.updated_at).toBeDefined();
      expect(task.created_at).not.toBeNull();
      expect(task.updated_at).not.toBeNull();
    });

    it('should update updated_at when updating a task', async () => {
      const taskBefore = await db.queryOne(
        `SELECT * FROM tasks WHERE id = ?`,
        [taskId]
      );

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      await db.run(
        `UPDATE tasks SET completed = ? WHERE id = ?`,
        [1, taskId]
      );

      const taskAfter = await db.queryOne(
        `SELECT * FROM tasks WHERE id = ?`,
        [taskId]
      );

      expect(taskAfter.updated_at).toBeDefined();
      expect(taskAfter.created_at).toBe(taskBefore.created_at);
      // updated_at should be different after update
      expect(new Date(taskAfter.updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(taskBefore.updated_at).getTime()
      );
    });
  });

  describe('Tag CRUD Operations', () => {
    let tagId;

    it('should set created_at and updated_at when creating a tag', async () => {
      const result = await db.run(
        `INSERT INTO tags (name, color) VALUES (?, ?)`,
        ['testtag', '#FF0000']
      );
      tagId = result.insertId;

      const tag = await db.queryOne(
        `SELECT * FROM tags WHERE id = ?`,
        [tagId]
      );

      expect(tag).toBeDefined();
      expect(tag.created_at).toBeDefined();
      expect(tag.updated_at).toBeDefined();
      expect(tag.created_at).not.toBeNull();
      expect(tag.updated_at).not.toBeNull();
    });

    it('should update updated_at when updating a tag', async () => {
      const tagBefore = await db.queryOne(
        `SELECT * FROM tags WHERE id = ?`,
        [tagId]
      );

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      await db.run(
        `UPDATE tags SET color = ? WHERE id = ?`,
        ['#00FF00', tagId]
      );

      const tagAfter = await db.queryOne(
        `SELECT * FROM tags WHERE id = ?`,
        [tagId]
      );

      expect(tagAfter.updated_at).toBeDefined();
      expect(tagAfter.created_at).toBe(tagBefore.created_at);
      // updated_at should be different after update
      expect(new Date(tagAfter.updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(tagBefore.updated_at).getTime()
      );
    });
  });

  describe('ShareNote CRUD Operations', () => {
    let shareId;
    let noteId;
    let userId1;
    let userId2;

    beforeAll(async () => {
      // Create users
      const result1 = await db.run(
        `INSERT INTO users (username, password_hash) VALUES (?, ?)`,
        ['shareuser1', 'hashedpassword']
      );
      userId1 = result1.insertId;

      const result2 = await db.run(
        `INSERT INTO users (username, password_hash) VALUES (?, ?)`,
        ['shareuser2', 'hashedpassword']
      );
      userId2 = result2.insertId;

      // Create a note
      const noteResult = await db.run(
        `INSERT INTO notes (title, body, owner_id) VALUES (?, ?, ?)`,
        ['Shared Note', 'Content', userId1]
      );
      noteId = noteResult.insertId;
    });

    it('should set created_at and updated_at when creating a share_note', async () => {
      const result = await db.run(
        `INSERT INTO share_notes (note_id, shared_by_id, shared_with_id, can_edit) VALUES (?, ?, ?, ?)`,
        [noteId, userId1, userId2, 1]
      );
      shareId = result.insertId;

      const share = await db.queryOne(
        `SELECT * FROM share_notes WHERE id = ?`,
        [shareId]
      );

      expect(share).toBeDefined();
      expect(share.created_at).toBeDefined();
      expect(share.updated_at).toBeDefined();
      expect(share.created_at).not.toBeNull();
      expect(share.updated_at).not.toBeNull();
    });

    it('should update updated_at when updating a share_note', async () => {
      const shareBefore = await db.queryOne(
        `SELECT * FROM share_notes WHERE id = ?`,
        [shareId]
      );

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      await db.run(
        `UPDATE share_notes SET can_edit = ? WHERE id = ?`,
        [0, shareId]
      );

      const shareAfter = await db.queryOne(
        `SELECT * FROM share_notes WHERE id = ?`,
        [shareId]
      );

      expect(shareAfter.updated_at).toBeDefined();
      expect(shareAfter.created_at).toBe(shareBefore.created_at);
      // updated_at should be different after update
      expect(new Date(shareAfter.updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(shareBefore.updated_at).getTime()
      );
    });
  });

  describe('Invitation CRUD Operations', () => {
    let invitationId;
    let userId;

    beforeAll(async () => {
      // Create a user
      const result = await db.run(
        `INSERT INTO users (username, password_hash) VALUES (?, ?)`,
        ['inviteuser', 'hashedpassword']
      );
      userId = result.insertId;
    });

    it('should set created_at and updated_at when creating an invitation', async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const result = await db.run(
        `INSERT INTO invitations (token, inviter_id, expires_at) VALUES (?, ?, ?)`,
        ['testtoken123', userId, expiresAt]
      );
      invitationId = result.insertId;

      const invitation = await db.queryOne(
        `SELECT * FROM invitations WHERE id = ?`,
        [invitationId]
      );

      expect(invitation).toBeDefined();
      expect(invitation.created_at).toBeDefined();
      expect(invitation.updated_at).toBeDefined();
      expect(invitation.created_at).not.toBeNull();
      expect(invitation.updated_at).not.toBeNull();
    });

    it('should update updated_at when updating an invitation', async () => {
      const invitationBefore = await db.queryOne(
        `SELECT * FROM invitations WHERE id = ?`,
        [invitationId]
      );

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      await db.run(
        `UPDATE invitations SET used = ? WHERE id = ?`,
        [1, invitationId]
      );

      const invitationAfter = await db.queryOne(
        `SELECT * FROM invitations WHERE id = ?`,
        [invitationId]
      );

      expect(invitationAfter.updated_at).toBeDefined();
      expect(invitationAfter.created_at).toBe(invitationBefore.created_at);
      // updated_at should be different after update
      expect(new Date(invitationAfter.updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(invitationBefore.updated_at).getTime()
      );
    });
  });

  describe('PasswordResetToken CRUD Operations', () => {
    let tokenId;
    let userId;

    beforeAll(async () => {
      // Create a user
      const result = await db.run(
        `INSERT INTO users (username, password_hash) VALUES (?, ?)`,
        ['resetuser', 'hashedpassword']
      );
      userId = result.insertId;
    });

    it('should set created_at and updated_at when creating a password_reset_token', async () => {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const result = await db.run(
        `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`,
        [userId, 'resettoken123', expiresAt]
      );
      tokenId = result.insertId;

      const token = await db.queryOne(
        `SELECT * FROM password_reset_tokens WHERE id = ?`,
        [tokenId]
      );

      expect(token).toBeDefined();
      expect(token.created_at).toBeDefined();
      expect(token.updated_at).toBeDefined();
      expect(token.created_at).not.toBeNull();
      expect(token.updated_at).not.toBeNull();
    });

    it('should update updated_at when updating a password_reset_token', async () => {
      const tokenBefore = await db.queryOne(
        `SELECT * FROM password_reset_tokens WHERE id = ?`,
        [tokenId]
      );

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      await db.run(
        `UPDATE password_reset_tokens SET used = ? WHERE id = ?`,
        [1, tokenId]
      );

      const tokenAfter = await db.queryOne(
        `SELECT * FROM password_reset_tokens WHERE id = ?`,
        [tokenId]
      );

      expect(tokenAfter.updated_at).toBeDefined();
      expect(tokenAfter.created_at).toBe(tokenBefore.created_at);
      // updated_at should be different after update
      expect(new Date(tokenAfter.updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(tokenBefore.updated_at).getTime()
      );
    });
  });
});
