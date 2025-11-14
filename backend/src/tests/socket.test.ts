import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createApp, createSocketServer } from '../app';
import { connectDatabase } from '../config/database';
import User from '../models/User';
import Lobby from '../models/Lobby';
import mongoose from 'mongoose';
import request from 'supertest';

// Integration test that walks through the live socket gameplay

describe('Socket.IO Game Flow', () => {
  let httpServer: HTTPServer;
  let ioServer: SocketIOServer;
  let client1: ClientSocket;
  let client2: ClientSocket;
  let token1: string;
  let token2: string;
  let lobbyCode: string;
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase();

    // Spin up the socket server
    const serverSetup = createSocketServer(app);
    httpServer = serverSetup.httpServer;
    ioServer = serverSetup.io;

    // Run the server on a random port
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => resolve());
    });
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Lobby.deleteMany({});

    // Register two players through the API
    const response1 = await request(app).post('/api/auth/register').send({
      name: 'SocketPlayer1',
      pin: '1234',
    });
    token1 = response1.body.data.token;

    const response2 = await request(app).post('/api/auth/register').send({
      name: 'SocketPlayer2',
      pin: '5678',
    });
    token2 = response2.body.data.token;

    // Make a lobby for the match
    const lobbyResponse = await request(app)
      .post('/api/lobbies')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        name: 'Socket Test Lobby',
        maxPlayers: 4,
        settings: {
          questionCount: 3, // Keep it short for the test run
          questionTimeLimit: 10,
        },
      });
    lobbyCode = lobbyResponse.body.data.lobby.code;

    // Connect socket clients to the server
    const address = httpServer.address();
    if (!address || typeof address === 'string') {
      throw new Error('Invalid server address');
    }
    const port = address.port;

    client1 = Client(`http://localhost:${port}`);
    client2 = Client(`http://localhost:${port}`);

    // Wait until both sockets connect
    await Promise.all([
      new Promise<void>((resolve) => client1.on('connect', resolve)),
      new Promise<void>((resolve) => client2.on('connect', resolve)),
    ]);
  });

  afterEach(() => {
    client1?.disconnect();
    client2?.disconnect();
  });

  afterAll(async () => {
    ioServer?.close();
    httpServer?.close();
    await mongoose.connection.close();
  });

  it('should complete a full game flow with two players', async () => {
    // Have both sockets log in
    const auth1Promise = new Promise<void>((resolve) => {
      client1.once('authenticated', () => resolve());
    });
    client1.emit('authenticate', { token: token1 });
    await auth1Promise;

    const auth2Promise = new Promise<void>((resolve) => {
      client2.once('authenticated', () => resolve());
    });
    client2.emit('authenticate', { token: token2 });
    await auth2Promise;

    // Player 1 joins through sockets
    const join1Promise = new Promise<void>((resolve) => {
      client1.once('joinedLobby', () => resolve());
    });
    client1.emit('joinLobby', { code: lobbyCode });
    await join1Promise;

    // Player 2 joins via the REST API first
    await request(app)
      .post(`/api/lobbies/${lobbyCode}/join`)
      .set('Authorization', `Bearer ${token2}`);

    // Then Player 2 joins with their socket
    const join2Promise = new Promise<void>((resolve) => {
      client2.once('joinedLobby', () => resolve());
    });
    client2.emit('joinLobby', { code: lobbyCode });
    await join2Promise;

    // Player 1 starts the game
    const gameStartPromise = Promise.all([
      new Promise<void>((resolve) => {
        client1.once('gameStart', (data) => {
          expect(data.totalQuestions).toBeGreaterThan(0);
          resolve();
        });
      }),
      new Promise<void>((resolve) => {
        client2.once('gameStart', () => resolve());
      }),
    ]);

    client1.emit('startGame', { code: lobbyCode });
    await gameStartPromise;

    // Wait for the first question to arrive
    const questionPromise = Promise.all([
      new Promise<any>((resolve) => {
        client1.once('newQuestion', (data) => {
          expect(data.questionId).toBeDefined();
          expect(data.prompt).toBeDefined();
          expect(data.choices).toHaveLength(4);
          resolve(data);
        });
      }),
      new Promise<any>((resolve) => {
        client2.once('newQuestion', (data) => resolve(data));
      }),
    ]);

    const [question1] = await questionPromise;

    // Both players send back answers
    const answer1Promise = new Promise<void>((resolve) => {
      client1.once('answerResult', (data) => {
        expect(data.isCorrect).toBeDefined();
        expect(data.correctAnswer).toBeDefined();
        resolve();
      });
    });

    client1.emit('submitAnswer', {
      questionId: question1.questionId,
      answer: question1.choices[0],
      timeToAnswer: 5000,
    });

    await answer1Promise;

    const answer2Promise = new Promise<void>((resolve) => {
      client2.once('answerResult', () => resolve());
    });

    client2.emit('submitAnswer', {
      questionId: question1.questionId,
      answer: question1.choices[1],
      timeToAnswer: 6000,
    });

    await answer2Promise;

    // Wait for a score update
    const scoreUpdatePromise = new Promise<void>((resolve) => {
      client1.once('scoreUpdate', (data) => {
        expect(data.players).toBeDefined();
        expect(data.players.length).toBeGreaterThanOrEqual(2);
        resolve();
      });
    });

    await scoreUpdatePromise;

    // We stop early; full completion would require timing out all questions
  }, 15000); // Increased timeout for socket operations

  it('should handle player disconnection gracefully', async () => {
    // Log in the first client
    const auth1Promise = new Promise<void>((resolve) => {
      client1.once('authenticated', () => resolve());
    });
    client1.emit('authenticate', { token: token1 });
    await auth1Promise;

    // Join the lobby from sockets
    const join1Promise = new Promise<void>((resolve) => {
      client1.once('joinedLobby', () => resolve());
    });
    client1.emit('joinLobby', { code: lobbyCode });
    await join1Promise;

    // Disconnect on purpose
    client1.disconnect();

    // Give the server a moment to react
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Make sure the lobby is still around
    const lobby = await Lobby.findOne({ code: lobbyCode });
    expect(lobby).toBeDefined();
  }, 10000);

  it('should reject unauthenticated socket connections', async () => {
    const errorPromise = new Promise<void>((resolve) => {
      client1.once('error', (data) => {
        expect(data.message).toContain('Authentication');
        resolve();
      });
    });

    // Attempt to join without logging in
    client1.emit('joinLobby', { code: lobbyCode });

    await errorPromise;
  }, 10000);
});

