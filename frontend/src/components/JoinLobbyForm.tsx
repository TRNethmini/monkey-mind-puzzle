import { useState, useEffect } from "react";
import { ArrowLeft, Users, RefreshCw } from "lucide-react";
import { GameButton } from "@/components/ui/game-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiService } from "@/services/apiService";

interface JoinLobbyFormProps {
  onBack: () => void;
  onSuccess: (lobbyCode: string) => void;
}

interface PublicLobby {
  code: string;
  name: string;
  ownerName: string;
  playerCount: number;
  maxPlayers: number;
  status: string;
}

export function JoinLobbyForm({ onBack, onSuccess }: JoinLobbyFormProps) {
  const [lobbyCode, setLobbyCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [publicLobbies, setPublicLobbies] = useState<PublicLobby[]>([]);
  const [loadingLobbies, setLoadingLobbies] = useState(true);
  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    fetchPublicLobbies();
  }, []);

  const fetchPublicLobbies = async () => {
    setLoadingLobbies(true);
    try {
      const result = await apiService.getPublicLobbies();
      if (result.success && result.data?.lobbies) {
        setPublicLobbies(result.data.lobbies);
      } else {
        setPublicLobbies([]);
      }
    } catch (error) {
      toast.error("Failed to load lobbies");
      setPublicLobbies([]);
    } finally {
      setLoadingLobbies(false);
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!lobbyCode.trim()) {
      toast.error("Please enter a lobby code");
      return;
    }

    setLoading(true);
    try {
      const result = await apiService.joinLobby(token, lobbyCode.toUpperCase());
      if (result.success) {
        toast.success("Joined lobby!");
        onSuccess(lobbyCode.toUpperCase());
      } else {
        toast.error(result.error || result.message || "Failed to join lobby");
      }
    } catch (error) {
      toast.error("Failed to join lobby");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLobby = async (code: string) => {
    try {
      const result = await apiService.joinLobby(token, code);
      if (result.success) {
        toast.success("Joining lobby...");
        onSuccess(code);
      } else {
        toast.error(result.error || result.message || "Failed to join lobby");
      }
    } catch (error) {
      toast.error("Failed to join lobby");
    }
  };

  return (
    <div className="flex items-center justify-center h-full particles-bg">
      <div className="w-full max-w-4xl space-y-8 animate-fade-in px-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="game-card border-2 border-primary/30 space-y-6">
            <h2 className="text-2xl font-bold">Join by Code</h2>
            
            <form onSubmit={handleJoinByCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Lobby Code</Label>
                <Input
                  id="code"
                  value={lobbyCode}
                  onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  className="bg-muted border-border focus:border-primary text-2xl text-center tracking-widest"
                />
              </div>

              <GameButton
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                glow
                loading={loading}
              >
                Join Lobby
              </GameButton>
            </form>
          </div>

          <div className="game-card border-2 border-secondary/30 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Public Lobbies</h2>
              <GameButton
                variant="outline"
                size="sm"
                onClick={fetchPublicLobbies}
                disabled={loadingLobbies}
              >
                <RefreshCw className={`h-4 w-4 ${loadingLobbies ? 'animate-spin' : ''}`} />
              </GameButton>
            </div>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {loadingLobbies ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading lobbies...
                </div>
              ) : publicLobbies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No public lobbies available
                </div>
              ) : (
                publicLobbies.map((lobby) => (
                  <div
                    key={lobby.code}
                    className="game-card bg-muted/50 border border-border hover:border-secondary/50 transition-all cursor-pointer"
                    onClick={() => handleJoinLobby(lobby.code)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold">{lobby.name}</h3>
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                        {lobby.code}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {lobby.playerCount}/{lobby.maxPlayers}
                      </span>
                      <span>by {lobby.ownerName}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
