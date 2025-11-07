import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  }

  connect(token?: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (token) {
      this.token = token;
    }

    this.socket = io(this.baseURL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected to server');
      
      // Log in once the socket connects
      if (this.token) {
        this.socket?.emit('authenticate', { token: this.token });
      }
    });

    this.socket.on('authenticated', (data: any) => {
      console.log('[Socket] Authenticated successfully', data);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('[Socket] Error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  emit(event: string, data?: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('[Socket] Cannot emit, socket not connected');
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    this.socket?.off(event, callback);
  }
}

export const socketService = new SocketService();
