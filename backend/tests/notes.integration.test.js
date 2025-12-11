/**
 * Notes Integration Tests
 * Tests core note CRUD operations with real database
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import db from '../src/config/database.js';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Notes Integration Tests', () => {
  const testDbPath = path.join(__dirname, 'test-notes.db');
  let app;
  let authToken;
  let userId;

  beforeAll(async () => {
    // Set up test database
    process.env.NOTES_DB_PATH = testDbPath;
    process.env.JWT_SECRET = 'test-secret-key-for-notes-tests';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';

    // Connect and initialize schema
    await db.connect();
    await db.initSchema();

    // Import app after database is set up
    app = (await import('../src/index.js')).default;

    // Create a test user and get auth token
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
    const result = await db.run(
      `INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)`,
      ['notesuser', hashedPassword, 'notesuser@example.com'],
    );
    userId = result.insertId;

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'notesuser', password: 'TestPassword123!' });

    authToken = loginResponse.body.data.access_token;
  });

  afterAll(async () => {
    // Clean up
    await db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    // Clean up WAL files
    const walPath = `${testDbPath}-wal`;
    const shmPath = `${testDbPath}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  });

  describe('Note CRUD Operations', () => {
    let noteId;

    it('should create a new note', async () => {
      const response = await request(app)
        .post('/api/v1/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Note',
          body: 'This is a test note body',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('note');
      expect(response.body.note).toHaveProperty('id');
      expect(response.body.note.title).toBe('Test Note');
      expect(response.body.note.body).toBe('This is a test note body');

      noteId = response.body.note.id;
    });

    it('should list all notes', async () => {
      const response = await request(app)
        .get('/api/v1/notes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('notes');
      expect(response.body.notes).toBeInstanceOf(Array);
      expect(response.body.notes.length).toBeGreaterThanOrEqual(1);
      expect(response.body).toHaveProperty('tags');
    });

    it('should get a specific note', async () => {
      const response = await request(app)
        .get(`/api/v1/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('note');
      expect(response.body.note.id).toBe(noteId);
      expect(response.body.note.title).toBe('Test Note');
    });

    it('should update a note', async () => {
      const response = await request(app)
        .put(`/api/v1/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Note',
          body: 'Updated body',
        });

      expect(response.status).toBe(200);
      expect(response.body.note.title).toBe('Updated Note');
      expect(response.body.note.body).toBe('Updated body');
    });

    it('should delete a note', async () => {
      const response = await request(app)
        .delete(`/api/v1/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');

      // Verify note is deleted
      const getResponse = await request(app)
        .get(`/api/v1/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });
  });

  describe('Note Features', () => {
    let noteId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Feature Test', body: 'Testing features' });
      noteId = response.body.note.id;
    });

    it('should toggle favorite status', async () => {
      const response = await request(app)
        .post(`/api/v1/notes/${noteId}/toggle-favorite`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('favorite');
    });

    it('should toggle pin status', async () => {
      const response = await request(app)
        .post(`/api/v1/notes/${noteId}/toggle-pin`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('pinned');
    });
  });

  describe('Authorization', () => {
    it('should return 401 when creating note without auth', async () => {
      const response = await request(app)
        .post('/api/v1/notes')
        .send({ title: 'Test', body: 'Test' });

      expect(response.status).toBe(401);
    });

    it('should return 401 when listing notes without auth', async () => {
      const response = await request(app).get('/api/v1/notes');
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent note', async () => {
      const response = await request(app)
        .get('/api/v1/notes/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});
