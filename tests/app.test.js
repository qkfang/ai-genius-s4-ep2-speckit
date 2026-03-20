'use strict';

const request = require('supertest');
const app = require('../src/ai-genius-web/server');

describe('Express App', () => {
  describe('GET /', () => {
    it('should return app metadata', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('name', 'AI Genius SpecKit Demo');
      expect(res.body).toHaveProperty('endpoints');
      expect(Array.isArray(res.body.endpoints)).toBe(true);
    });
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'healthy');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/status', () => {
    it('should return status with speckit info', async () => {
      const res = await request(app).get('/api/status');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'running');
      expect(res.body).toHaveProperty('speckit');
      expect(res.body.speckit).toHaveProperty('enabled', true);
    });
  });

  describe('GET /nonexistent', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Not found');
    });
  });
});
