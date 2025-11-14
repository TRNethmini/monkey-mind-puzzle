import request from 'supertest';
import { createApp } from '../app';
import { connectDatabase } from '../config/database';
import User from '../models/User';
import mongoose from 'mongoose';

const app = createApp();

describe('Authentication API', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'TestUser',
          pin: '1234',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.name).toBe('TestUser');
      expect(response.body.data.user.id).toBeDefined();
    });

    it('should reject registration with invalid PIN format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'TestUser',
          pin: '123', // Just three digits on purpose
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('4 digits');
    });

    it('should reject registration with missing name', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          pin: '1234',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject duplicate usernames', async () => {
      // Make the initial user
      await request(app).post('/api/auth/register').send({
        name: 'TestUser',
        pin: '1234',
      });

      // Try to reuse the same name
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'TestUser',
          pin: '5678',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already taken');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Load a known user before each check
      await request(app).post('/api/auth/register').send({
        name: 'TestUser',
        pin: '1234',
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          name: 'TestUser',
          pin: '1234',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.name).toBe('TestUser');
    });

    it('should reject login with wrong PIN', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          name: 'TestUser',
          pin: '9999',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should reject login with non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          name: 'NonExistent',
          pin: '1234',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    let token: string;

    beforeEach(async () => {
      const response = await request(app).post('/api/auth/register').send({
        name: 'TestUser',
        pin: '1234',
      });
      token = response.body.data.token;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.name).toBe('TestUser');
    });

    it('should reject request without token', async () => {
      const response = await request(app).get('/api/auth/me').expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});

