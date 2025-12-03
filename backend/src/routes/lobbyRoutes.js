import { Router } from 'express';
import {
  getPublicLobbies,
  getLobbyDetails,
  createLobby,
  joinLobby,
  leaveLobby,
  startGame,
  updateLobby,
} from '../controllers/lobbyController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Routes for listing, creating, and managing lobbies

// Anyone can browse public lobbies
router.get('/public', getPublicLobbies);

// Everything else needs a logged-in user
router.post('/', authenticateToken, createLobby);
router.get('/:code', authenticateToken, getLobbyDetails);
router.put('/:code', authenticateToken, updateLobby);
router.post('/:code/join', authenticateToken, joinLobby);
router.post('/:code/leave', authenticateToken, leaveLobby);
router.post('/:code/start', authenticateToken, startGame);

export default router;

