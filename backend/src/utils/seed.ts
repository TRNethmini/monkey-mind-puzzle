import { connectDatabase } from '../config/database';
import User from '../models/User';
import Lobby from '../models/Lobby';
import logger from '../config/logger';
import mongoose from 'mongoose';

// Simple script that loads demo users and a lobby (npm run seed)

async function seed(): Promise<void> {
  try {
    await connectDatabase();

    logger.info('Starting database seed...');

    // Start fresh
    await User.deleteMany({});
    await Lobby.deleteMany({});

    logger.info('Cleared existing data');

    // Add a few sample users
    const users = [
      { name: 'Alice', pin: '1234' },
      { name: 'Bob', pin: '5678' },
      { name: 'Charlie', pin: '9012' },
      { name: 'Diana', pin: '3456' },
    ];

    const createdUsers = [];

    for (const userData of users) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      logger.info(`Created user: ${user.name} (PIN: ${userData.pin})`);
    }

    // Drop in a ready-to-play lobby
    const demoLobby = new Lobby({
      code: 'DEMO01',
      name: 'Demo Lobby - Join Now!',
      ownerId: createdUsers[0]._id,
      isPublic: true,
      maxPlayers: 8,
      players: [
        {
          userId: createdUsers[0]._id.toString(),
          name: createdUsers[0].name,
          score: 0,
          answers: [],
        },
      ],
      settings: {
        maxPlayers: 8,
        questionCount: 10,
        questionTimeLimit: 30,
        difficulty: 'medium',
      },
      status: 'waiting',
    });

    await demoLobby.save();

    logger.info(`Created demo lobby: ${demoLobby.code}`);

    logger.info('✅ Database seeded successfully!');
    logger.info('\nDemo Users:');
    users.forEach((u) => {
      logger.info(`  - ${u.name} (PIN: ${u.pin})`);
    });
    logger.info(`\nDemo Lobby: ${demoLobby.code}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    logger.error('Seed error:', error);
    process.exit(1);
  }
}

seed();

