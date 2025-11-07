const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

interface AuthResponse {
  success: boolean;
  data?: {
    token: string;
    user: {
      id: string;
      name: string;
      totalWins: number;
      totalGames: number;
      avatarUrl: string;
      createdAt: string;
    };
  };
  message?: string;
  error?: string;
}

interface LobbyData {
  name: string;
  maxPlayers?: number;
  isPublic?: boolean;
  settings?: {
    questionCount?: number;
    questionTimeLimit?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
  };
}

export const apiService = {
  async register(name: string, pin: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, pin }),
      });
      return await response.json();
    } catch (error) {
      console.error('[API] Register error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  },

  async login(name: string, pin: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, pin }),
      });
      return await response.json();
    } catch (error) {
      console.error('[API] Login error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  },

  async createLobby(token: string, lobbyData: LobbyData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/lobbies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(lobbyData),
      });
      return await response.json();
    } catch (error) {
      console.error('[API] Create lobby error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  },

  async getPublicLobbies() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/lobbies/public`);
      return await response.json();
    } catch (error) {
      console.error('[API] Get lobbies error:', error);
      return { success: false, data: { lobbies: [] } };
    }
  },

  async joinLobby(token: string, lobbyCode: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/lobbies/${lobbyCode}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      return await response.json();
    } catch (error) {
      console.error('[API] Join lobby error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  },

  async leaveLobby(token: string, lobbyCode: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/lobbies/${lobbyCode}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      return await response.json();
    } catch (error) {
      console.error('[API] Leave lobby error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  },

  async startGame(token: string, lobbyCode: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/lobbies/${lobbyCode}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      return await response.json();
    } catch (error) {
      console.error('[API] Start game error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  },

  async updateLobby(token: string, lobbyCode: string, settings: {
    maxPlayers?: number;
    questionCount?: number;
    questionTimeLimit?: number;
    difficulty?: string;
    isPublic?: boolean;
    name?: string;
  }) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/lobbies/${lobbyCode}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      return await response.json();
    } catch (error) {
      console.error('[API] Update lobby error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  },
};
