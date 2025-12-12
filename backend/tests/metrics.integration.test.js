/**
 * Integration tests for Prometheus metrics
 */

import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const API_URL = process.env.API_URL || 'http://localhost:5000';

describe('Metrics Integration Tests', () => {
  describe('GET /metrics', () => {
    it('should return metrics in Prometheus format', async () => {
      const response = await request(API_URL).get('/metrics');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
    });

    it('should include default Node.js metrics', async () => {
      const response = await request(API_URL).get('/metrics');

      expect(response.text).toContain('process_cpu_user_seconds_total');
      expect(response.text).toContain('process_resident_memory_bytes');
      expect(response.text).toContain('nodejs_heap_size_total_bytes');
      expect(response.text).toContain('nodejs_eventloop_lag_seconds');
    });

    it('should include HTTP request metrics', async () => {
      // Make a request to generate metrics
      await request(API_URL).get('/api/health');

      const response = await request(API_URL).get('/metrics');

      expect(response.text).toContain('http_request_duration_seconds');
      expect(response.text).toContain('http_requests_total');
      expect(response.text).toContain('http_active_connections');
    });

    it('should include database metrics', async () => {
      const response = await request(API_URL).get('/metrics');

      expect(response.text).toContain('db_query_duration_seconds');
      expect(response.text).toContain('db_queries_total');
    });

    it('should include application metrics', async () => {
      const response = await request(API_URL).get('/metrics');

      expect(response.text).toContain('notehub_notes_total');
      expect(response.text).toContain('notehub_users_total');
      expect(response.text).toContain('notehub_tags_total');
      expect(response.text).toContain('notehub_auth_active_sessions');
    });

    it('should include authentication metrics', async () => {
      const response = await request(API_URL).get('/metrics');

      expect(response.text).toContain('notehub_auth_attempts_total');
      expect(response.text).toContain('notehub_2fa_operations_total');
    });

    it('should include note operation metrics', async () => {
      const response = await request(API_URL).get('/metrics');

      expect(response.text).toContain('notehub_note_operations_total');
      expect(response.text).toContain('notehub_tag_operations_total');
    });

    it('should include error tracking metrics', async () => {
      const response = await request(API_URL).get('/metrics');

      expect(response.text).toContain('notehub_api_errors_total');
    });

    it('should include cache metrics definition', async () => {
      const response = await request(API_URL).get('/metrics');

      expect(response.text).toContain('cache_operations_total');
    });

    it('should include search metrics definitions', async () => {
      const response = await request(API_URL).get('/metrics');

      expect(response.text).toContain('notehub_search_operations_total');
      expect(response.text).toContain('notehub_search_duration_seconds');
    });
  });

  describe('Metrics Recording', () => {
    it('should record HTTP requests', async () => {
      // Get initial metrics
      const before = await request(API_URL).get('/metrics');
      const beforeMatch = before.text.match(
        /http_requests_total\{[^}]*route="\/api\/health"[^}]*\}\s+(\d+)/,
      );
      const beforeCount = beforeMatch ? parseInt(beforeMatch[1], 10) : 0;

      // Make a test request
      await request(API_URL).get('/api/health');

      // Get updated metrics
      const after = await request(API_URL).get('/metrics');
      const afterMatch = after.text.match(
        /http_requests_total\{[^}]*route="\/api\/health"[^}]*\}\s+(\d+)/,
      );
      const afterCount = afterMatch ? parseInt(afterMatch[1], 10) : 0;

      expect(afterCount).toBeGreaterThan(beforeCount);
    });

    it('should record authentication attempts', async () => {
      // Get initial metrics
      const before = await request(API_URL).get('/metrics');
      const beforeHasAuth = before.text.includes('notehub_auth_attempts_total');

      // Make a failed login attempt
      await request(API_URL)
        .post('/api/v1/auth/login')
        .send({ username: 'testuser', password: 'wrongpassword' });

      // Get updated metrics
      const after = await request(API_URL).get('/metrics');

      expect(after.text).toContain('notehub_auth_attempts_total');
      expect(after.text).toContain('method="password"');
      expect(after.text).toContain('status="failure"');
    });

    it('should record API errors', async () => {
      // Make a request that will fail (401)
      await request(API_URL).get('/api/v1/notes');

      // Get metrics
      const response = await request(API_URL).get('/metrics');

      expect(response.text).toContain('notehub_api_errors_total');
      expect(response.text).toContain('error_type="client_error"');
      expect(response.text).toContain('status_code="401"');
    });
  });

  describe('Removed Metrics', () => {
    it('should NOT include request/response size metrics', async () => {
      const response = await request(API_URL).get('/metrics');

      expect(response.text).not.toContain('http_request_size_bytes');
      expect(response.text).not.toContain('http_response_size_bytes');
    });

    it('should NOT include connection pool metrics', async () => {
      const response = await request(API_URL).get('/metrics');

      expect(response.text).not.toContain('db_connection_pool_size');
    });

    it('should NOT include notes by status metrics', async () => {
      const response = await request(API_URL).get('/metrics');

      expect(response.text).not.toContain('notehub_notes_by_status');
    });

    it('should NOT include tasks total metrics', async () => {
      const response = await request(API_URL).get('/metrics');

      expect(response.text).not.toContain('notehub_tasks_total');
    });
  });

  describe('Metrics Endpoint', () => {
    it('should be accessible without authentication', async () => {
      const response = await request(API_URL).get('/metrics');

      expect(response.status).toBe(200);
    });

    it('should also be accessible at /api/metrics', async () => {
      const response = await request(API_URL).get('/api/metrics');

      expect(response.status).toBe(200);
      expect(response.text).toContain('# HELP');
    });

    it('should not track the metrics endpoint itself', async () => {
      // Get metrics multiple times
      await request(API_URL).get('/metrics');
      await request(API_URL).get('/metrics');

      const response = await request(API_URL).get('/metrics');

      // The metrics endpoint should not appear in the request counts
      expect(response.text).not.toContain('route="/metrics"');
      expect(response.text).not.toContain('route="/api/metrics"');
    });
  });
});
