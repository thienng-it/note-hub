/**
 * Chat Integration Tests
 * Tests chat functionality including message deletion, room deletion, and user status
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import db from '../src/config/database.js';
import { initializeSequelize, syncDatabase } from '../src/models/index.js';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Chat Integration Tests', () => {
  const testDbPath = path.join(__dirname, 'test-chat.db');
  let app;
  let authToken1;
  let authToken2;
  let userId1;
  let userId2;
  let roomId;
  let messageId;

  beforeAll(async () => {
    // Set up test database
    process.env.NOTES_DB_PATH = testDbPath;
    process.env.JWT_SECRET = 'test-secret-key-for-chat-tests';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';

    // Initialize Sequelize ORM
    await initializeSequelize();
    await syncDatabase();

    // Also initialize legacy DB for backward compatibility
    await db.connect();
    await db.initSchema();

    // Import app after database is set up
    app = (await import('../src/index.js')).default;

    // Create test users
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
    const result1 = await db.run(
      `INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)`,
      ['chatuser1', hashedPassword, 'chatuser1@example.com'],
    );
    userId1 = result1.insertId;

    const result2 = await db.run(
      `INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)`,
      ['chatuser2', hashedPassword, 'chatuser2@example.com'],
    );
    userId2 = result2.insertId;

    // Login to get tokens
    const loginResponse1 = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'chatuser1', password: 'TestPassword123!' });
    authToken1 = loginResponse1.body.data.access_token;

    const loginResponse2 = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'chatuser2', password: 'TestPassword123!' });
    authToken2 = loginResponse2.body.data.access_token;
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
    if (fs.existsSync(walPath)) {
      fs.unlinkSync(walPath);
    }
    if (fs.existsSync(shmPath)) {
      fs.unlinkSync(shmPath);
    }
  });

  describe('POST /api/v1/chat/rooms/direct', () => {
    it('should create a direct chat room', async () => {
      const response = await request(app)
        .post('/api/v1/chat/rooms/direct')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ userId: userId2 });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.is_group).toBe(false);

      roomId = response.body.data.id;
    });

    it('should not allow creating chat with yourself', async () => {
      const response = await request(app)
        .post('/api/v1/chat/rooms/direct')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ userId: userId1 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/chat/rooms/:roomId/messages', () => {
    it('should send a message', async () => {
      const response = await request(app)
        .post(`/api/v1/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ message: 'Hello, this is a test message!' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.message).toBe('Hello, this is a test message!');
      expect(response.body.data.sender).toHaveProperty('username', 'chatuser1');
      expect(response.body.data.sender).not.toHaveProperty('email');

      messageId = response.body.data.id;
    });

    it('should not send empty message', async () => {
      const response = await request(app)
        .post(`/api/v1/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ message: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/chat/rooms/:roomId/messages', () => {
    it('should get messages in a room', async () => {
      const response = await request(app)
        .get(`/api/v1/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('message');
      expect(response.body.data[0].sender).not.toHaveProperty('email');
    });

    it('should not allow non-participant to get messages', async () => {
      // Create another user
      const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
      await db.run(`INSERT INTO users (username, password_hash) VALUES (?, ?)`, [
        'chatuser3',
        hashedPassword,
      ]);

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'chatuser3', password: 'TestPassword123!' });
      const authToken3 = loginResponse.body.data.access_token;

      const response = await request(app)
        .get(`/api/v1/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${authToken3}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/chat/users', () => {
    it('should get available users without email', async () => {
      const response = await request(app)
        .get('/api/v1/chat/users')
        .set('Authorization', `Bearer ${authToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('username');
      expect(response.body.data[0]).not.toHaveProperty('email');
    });
  });

  describe('DELETE /api/v1/chat/rooms/:roomId/messages/:messageId', () => {
    it('should allow sender to delete their message', async () => {
      const response = await request(app)
        .delete(`/api/v1/chat/rooms/${roomId}/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify message is deleted
      const messagesResponse = await request(app)
        .get(`/api/v1/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${authToken1}`);

      const deletedMessage = messagesResponse.body.data.find((msg) => msg.id === messageId);
      expect(deletedMessage).toBeUndefined();
    });

    it('should not allow non-sender to delete message', async () => {
      // Create a new message from user1
      const createResponse = await request(app)
        .post(`/api/v1/chat/rooms/${roomId}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ message: 'Another test message' });

      const newMessageId = createResponse.body.data.id;

      // Try to delete with user2's token
      const response = await request(app)
        .delete(`/api/v1/chat/rooms/${roomId}/messages/${newMessageId}`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/chat/rooms/:roomId', () => {
    it('should allow participant to delete direct chat', async () => {
      const response = await request(app)
        .delete(`/api/v1/chat/rooms/${roomId}`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify room is deleted
      const roomsResponse = await request(app)
        .get('/api/v1/chat/rooms')
        .set('Authorization', `Bearer ${authToken1}`);

      const deletedRoom = roomsResponse.body.data.find((room) => room.id === roomId);
      expect(deletedRoom).toBeUndefined();
    });
  });

  describe('PUT /api/v1/profile/status', () => {
    it('should update user status', async () => {
      const response = await request(app)
        .put('/api/v1/profile/status')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ status: 'busy' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('busy');
    });

    it('should reject invalid status', async () => {
      const response = await request(app)
        .put('/api/v1/profile/status')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ status: 'invalid_status' });

      expect(response.status).toBe(400);
      expect(response.body.success).not.toBe(true);
    });

    it('should accept all valid statuses', async () => {
      const validStatuses = ['online', 'offline', 'away', 'busy'];

      for (const status of validStatuses) {
        const response = await request(app)
          .put('/api/v1/profile/status')
          .set('Authorization', `Bearer ${authToken1}`)
          .send({ status });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.status).toBe(status);
      }
    });
  });
});
