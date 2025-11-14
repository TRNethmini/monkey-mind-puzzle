import request from 'supertest';
import { createApp } from '../app';
import { connectDatabase } from '../config/database';
import User from '../models/User';
import Lobby from '../models/Lobby';
import mongoose from 'mongoose';

const app = createApp();

describe('Lobby Management API', () => {
  let token1: string;
  let token2: string;
  let userId1: string;
  let userId2: string;

  beforeAll(async () => {
    await connectDatabase();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Lobby.deleteMany({});

    // Spin up two players for the tests
    const response1 = await request(app).post('/api/auth/register').send({
      name: 'Player1',
      pin: '1234',
    });
    token1 = response1.body.data.token;
    userId1 = response1.body.data.user.id;

    const response2 = await request(app)
      .post('/api/auth/register')
      .send({
      name: 'Player2',
      pin: '5678',
    });
    token2 = response2.body.data.token;
    userId2 = response2.body.data.user.id;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/lobbies', () => {
    it('should create a new lobby', async () => {
      const response = await request(app)
        .post('/api/lobbies')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          name: 'Test Lobby',
          isPublic: true,
          maxPlayers: 4,
          settings: {
            questionCount: 10,
            questionTimeLimit: 30,
            difficulty: 'medium',
          },
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.lobby.code).toBeDefined();
      expect(response.body.data.lobby.name).toBe('Test Lobby');
      expect(response.body.data.lobby.players).toHaveLength(1);
    });

    it('should reject lobby creation without authentication', async () => {
      const response = await request(app)
        .post('/api/lobbies')
        .send({
          name: 'Test Lobby',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject lobby with invalid maxPlayers', async () => {
      const response = await request(app)
        .post('/api/lobbies')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          name: 'Test Lobby',
          maxPlayers: 20, // Too many
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/lobbies/public', () => {
    beforeEach(async () => {
    // Make a public lobby
      await request(app)
        .post('/api/lobbies')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          name: 'Public Lobby',
          isPublic: true,
        });

    // Make a private lobby too
      await request(app)
        .post('/api/lobbies')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          name: 'Private Lobby',
          isPublic: false,
        });
    });

    it('should list only public lobbies', async () => {
      const response = await request(app).get('/api/lobbies/public').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.lobbies).toHaveLength(1);
      expect(response.body.data.lobbies[0].name).toBe('Public Lobby');
    });
  });

  describe('POST /api/lobbies/:code/join', () => {
    let lobbyCode: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/lobbies')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          name: 'Test Lobby',
          maxPlayers: 4,
        });
      lobbyCode = response.body.data.lobby.code;
    });

    it('should allow player to join lobby', async () => {
      const response = await request(app)
        .post(`/api/lobbies/${lobbyCode}/join`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.lobby.players).toHaveLength(2);
    });

    it('should reject join for non-existent lobby', async () => {
      const response = await request(app)
        .post('/api/lobbies/INVALID/join')
        .set('Authorization', `Bearer ${token2}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should reject join when lobby is full', async () => {
      // Build a small lobby with only two slots
      const response = await request(app)
        .post('/api/lobbies')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          name: 'Small Lobby',
          maxPlayers: 2,
        });
      const smallLobbyCode = response.body.data.lobby.code;

      // Fill the second slot
      await request(app)
        .post(`/api/lobbies/${smallLobbyCode}/join`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      // Try adding a third player
      const response3 = await request(app).post('/api/auth/register').send({
        name: 'Player3',
        pin: '9012',
      });

      const response4 = await request(app)
        .post(`/api/lobbies/${smallLobbyCode}/join`)
        .set('Authorization', `Bearer ${response3.body.data.token}`)
        .expect(400);

      expect(response4.body.error).toContain('full');
    });
  });

  describe('POST /api/lobbies/:code/leave', () => {
    let lobbyCode: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/lobbies')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          name: 'Test Lobby',
        });
      lobbyCode = response.body.data.lobby.code;

      // Let Player 2 hop in
      await request(app)
        .post(`/api/lobbies/${lobbyCode}/join`)
        .set('Authorization', `Bearer ${token2}`);
    });

    it('should allow player to leave lobby', async () => {
      const response = await request(app)
        .post(`/api/lobbies/${lobbyCode}/leave`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.lobby.players).toHaveLength(1);
    });

    it('should transfer ownership when owner leaves', async () => {
      const response = await request(app)
        .post(`/api/lobbies/${lobbyCode}/leave`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Ownership should transfer to Player2
      expect(response.body.data.lobby.players).toHaveLength(1);
    });
  });

  describe('POST /api/lobbies/:code/start', () => {
    let lobbyCode: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/lobbies')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          name: 'Test Lobby',
        });
      lobbyCode = response.body.data.lobby.code;

      // Let Player 2 hop in again
      await request(app)
        .post(`/api/lobbies/${lobbyCode}/join`)
        .set('Authorization', `Bearer ${token2}`);
    });

    it('should allow owner to start game', async () => {
      const response = await request(app)
        .post(`/api/lobbies/${lobbyCode}/start`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.lobby.status).toBe('playing');
    });

    it('should reject non-owner from starting game', async () => {
      const response = await request(app)
        .post(`/api/lobbies/${lobbyCode}/start`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('owner');
    });

    it('should reject start with only one player', async () => {
      // Start a fresh lobby with just one person
      const response = await request(app)
        .post('/api/lobbies')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          name: 'Solo Lobby',
        });
      const soloCode = response.body.data.lobby.code;

      const response2 = await request(app)
        .post(`/api/lobbies/${soloCode}/start`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(400);

      expect(response2.body.error).toContain('at least 2 players');
    });
  });
});

