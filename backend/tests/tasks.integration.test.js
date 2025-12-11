/**
 * Tasks Integration Tests
 * Tests core task CRUD operations with real database
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

describe('Tasks Integration Tests', () => {
  const testDbPath = path.join(__dirname, 'test-tasks.db');
  let app;
  let authToken;
  let _userId;

  beforeAll(async () => {
    // Set up test database
    process.env.NOTES_DB_PATH = testDbPath;
    process.env.JWT_SECRET = 'test-secret-key-for-tasks-tests';
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
      ['tasksuser', hashedPassword, 'tasksuser@example.com'],
    );
    _userId = result.insertId;

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'tasksuser', password: 'TestPassword123!' });

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

  describe('Task CRUD Operations', () => {
    let taskId;

    it('should create a new task', async () => {
      const response = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Task',
          description: 'This is a test task',
          priority: 'medium',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('task');
      expect(response.body.task).toHaveProperty('id');
      expect(response.body.task.title).toBe('Test Task');
      expect(response.body.task.priority).toBe('medium');

      taskId = response.body.task.id;
    });

    it('should list all tasks', async () => {
      const response = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tasks');
      expect(response.body.tasks).toBeInstanceOf(Array);
      expect(response.body.tasks.length).toBeGreaterThanOrEqual(1);
      expect(response.body).toHaveProperty('counts');
    });

    it('should get a specific task', async () => {
      const response = await request(app)
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('task');
      expect(response.body.task.id).toBe(taskId);
      expect(response.body.task.title).toBe('Test Task');
    });

    it('should update a task', async () => {
      const response = await request(app)
        .put(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Task',
          description: 'Updated description',
          priority: 'high',
        });

      expect(response.status).toBe(200);
      expect(response.body.task.title).toBe('Updated Task');
      expect(response.body.task.description).toBe('Updated description');
      expect(response.body.task.priority).toBe('high');
    });

    it('should delete a task', async () => {
      const response = await request(app)
        .delete(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');

      // Verify task is deleted
      const getResponse = await request(app)
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });
  });

  describe('Task Features', () => {
    let taskId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Complete Test', description: 'Test completion' });
      taskId = response.body.task.id;
    });

    it('should toggle task completion', async () => {
      // Mark as complete using PUT
      const response1 = await request(app)
        .put(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ completed: true });

      expect(response1.status).toBe(200);
      expect(response1.body.task.completed).toBe(true);

      // Mark as incomplete
      const response2 = await request(app)
        .put(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ completed: false });

      expect(response2.status).toBe(200);
      expect(response2.body.task.completed).toBe(false);
    });

    it('should create task with different priorities', async () => {
      const priorities = ['low', 'medium', 'high'];

      for (const priority of priorities) {
        const response = await request(app)
          .post('/api/v1/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: `${priority} priority task`, priority });

        expect(response.status).toBe(201);
        expect(response.body.task.priority).toBe(priority);
      }
    });

    it('should filter tasks by status', async () => {
      const response = await request(app)
        .get('/api/v1/tasks?filter=active')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.tasks).toBeInstanceOf(Array);
    });
  });

  describe('Authorization', () => {
    it('should return 401 when creating task without auth', async () => {
      const response = await request(app)
        .post('/api/v1/tasks')
        .send({ title: 'Test', description: 'Test' });

      expect(response.status).toBe(401);
    });

    it('should return 401 when listing tasks without auth', async () => {
      const response = await request(app).get('/api/v1/tasks');
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .get('/api/v1/tasks/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});
