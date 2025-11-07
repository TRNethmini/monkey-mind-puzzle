import { useState, useEffect } from "react";
import { Crown, Users, Settings2 } from "lucide-react";
import { GameButton } from "@/components/ui/game-button";
import { toast } from "sonner";
import { socketService } from "@/services/socketService";
import { apiService } from "@/services/apiService";
import { EditLobbySettingsModal } from "@/components/EditLobbySettingsModal";

interface Player {
  userId: string;
  name: string;
  score: number;
  socketId?: string;
  avatarUrl?: string;
}

interface Lobby {
  code: string;
  name: string;
  ownerId: string;
  isPublic: boolean;
  maxPlayers: number;
  players: Player[];
  status: string;
  settings: {
    maxPlayers: number;
    questionCount: number;
    questionTimeLimit: number;
    difficulty: string;
  };
}

interface LobbyRoomProps {
  lobbyCode: string;
  onStartGame: () => void;
  onLeaveLobby: () => void;
}

export function LobbyRoom({ lobbyCode, onStartGame, onLeaveLobby }: LobbyRoomProps) {
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditSettings, setShowEditSettings] = useState(false);
  const currentUserId = JSON.parse(localStorage.getItem('user') || '{}').id;
  const token = localStorage.getItem('token') || '';

  const isOwner = lobby?.ownerId === currentUserId;
  const canStart = isOwner && lobby && lobby.players.length >= 2;

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    // Join the lobby room so we get live updates
    socket.emit('joinLobby', { code: lobbyCode });

    // Wait for the server to confirm the join
    socket.on('joinedLobby', (data: { lobby: Lobby }) => {
      console.log('[Lobby] Joined lobby:', data);
      setLobby(data.lobby);
      setLoading(false);
    });

    // Keep track of people jumping in or out
    socket.on('lobbyUpdate', (data: { lobby: Lobby }) => {
      console.log('[Lobby] Lobby updated:', data);
      setLobby(data.lobby);
    });

    // Move to the game screen once it starts
    socket.on('gameStart', () => {
      console.log('[Lobby] Game is starting!');
      toast.success('Game is starting!');
      onStartGame();
    });

    return () => {
      socket.off('joinedLobby');
      socket.off('lobbyUpdate');
      socket.off('gameStart');
    };
  }, [lobbyCode, onStartGame]);

  const handleStartGame = async () => {
    if (!canStart) return;

    try {
      const result = await apiService.startGame(token, lobbyCode);
      if (result.success) {
        // Trigger the socket event so everyone starts together
        socketService.emit('startGame', { code: lobbyCode });
        toast.success('Starting game...');
      } else {
        toast.error(result.error || 'Failed to start game');
      }
    } catch (error) {
      toast.error('Failed to start game');
    }
  };

  const handleLeaveLobby = async () => {
    try {
      await apiService.leaveLobby(token, lobbyCode);
      socketService.emit('leaveLobby', { code: lobbyCode });
      onLeaveLobby();
    } catch (error) {
      console.error('Leave lobby error:', error);
      onLeaveLobby();
    }
  };

  const handleSaveSettings = async (settings: any) => {
    try {
      const result = await apiService.updateLobby(token, lobbyCode, settings);
      if (result.success) {
        toast.success('Settings updated!');
        // Share the updated settings over sockets too
        socketService.emit('updateLobbySettings', {
          code: lobbyCode,
          settings,
        });
      } else {
        toast.error(result.error || 'Failed to update settings');
      }
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  if (loading || !lobby) {
    return (
      <div className="flex items-center justify-center h-full particles-bg">
        <div className="game-card text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading lobby...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full particles-bg">
      <div className="w-full max-w-4xl space-y-8 animate-fade-in px-4">
        <div className="game-card border-2 border-primary/30 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">{lobby.name}</h2>
              <p className="text-muted-foreground">
                Code: <span className="text-primary font-mono text-xl">{lobbyCode}</span>
              </p>
            </div>
            <GameButton variant="outline" size="sm" onClick={handleLeaveLobby}>
              Leave Lobby
            </GameButton>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-bold">
                  Players ({lobby.players.length}/{lobby.maxPlayers})
                </h3>
              </div>
              <div className="space-y-3">
                {lobby.players.map((player) => (
                  <div
                    key={player.userId}
                    className="game-card bg-muted/50 border border-border flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-primary/40 bg-muted/40 flex items-center justify-center">
                      {player.avatarUrl ? (
                        <img
                          src={player.avatarUrl}
                          alt={`${player.name}'s avatar`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-bold text-primary">
                          {player.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{player.name}</span>
                        {player.userId === lobby.ownerId && (
                          <Crown className="h-4 w-4 text-secondary" title="Lobby Owner" />
                        )}
                        {player.userId === currentUserId && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </div>
                    </div>

                    {player.socketId ? (
                      <div className="w-2 h-2 rounded-full bg-green-500" title="Connected" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-gray-500" title="Disconnected" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Match Settings</h3>
                {isOwner && (
                  <GameButton
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEditSettings(true)}
                    className="flex items-center gap-2"
                  >
                    <Settings2 className="h-4 w-4" />
                    <span>Edit</span>
                  </GameButton>
                )}
              </div>
              <div className="game-card bg-muted/50 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Questions:</span>
                  <span className="font-bold">{lobby.settings.questionCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time per Question:</span>
                  <span className="font-bold">{lobby.settings.questionTimeLimit}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Players:</span>
                  <span className="font-bold">{lobby.settings.maxPlayers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Difficulty:</span>
                  <span className="font-bold capitalize">{lobby.settings.difficulty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Visibility:</span>
                  <span className="font-bold">{lobby.isPublic ? 'Public' : 'Private'}</span>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                {isOwner ? (
                  <GameButton
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={handleStartGame}
                    disabled={!canStart}
                    glow={canStart}
                  >
                    {canStart ? 'Start Game' : `Waiting for players... (${lobby.players.length}/${lobby.maxPlayers})`}
                  </GameButton>
                ) : (
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-muted-foreground">
                      Waiting for <span className="text-primary font-bold">host</span> to start...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {lobby && (
        <EditLobbySettingsModal
          open={showEditSettings}
          onClose={() => setShowEditSettings(false)}
          currentSettings={{
            name: lobby.name,
            maxPlayers: lobby.settings.maxPlayers,
            questionCount: lobby.settings.questionCount,
            questionTimeLimit: lobby.settings.questionTimeLimit,
            difficulty: lobby.settings.difficulty,
            isPublic: lobby.isPublic,
          }}
          onSave={handleSaveSettings}
        />
      )}
    </div>
  );
}
