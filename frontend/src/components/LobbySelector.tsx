import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { GameButton } from "@/components/ui/game-button";
import { CreateLobbyForm } from "./CreateLobbyForm";
import { JoinLobbyForm } from "./JoinLobbyForm";

interface LobbySelectorProps {
  onBack: () => void;
  onLobbyJoined: (lobbyId: string) => void;
}

export function LobbySelector({ onBack, onLobbyJoined }: LobbySelectorProps) {
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");

  if (mode === "create") {
    return (
      <CreateLobbyForm
        onBack={() => setMode("menu")}
        onSuccess={onLobbyJoined}
      />
    );
  }

  if (mode === "join") {
    return (
      <JoinLobbyForm
        onBack={() => setMode("menu")}
        onSuccess={onLobbyJoined}
      />
    );
  }

  return (
    <div className="flex items-center justify-center h-full particles-bg">
      <div className="w-full max-w-2xl space-y-8 animate-fade-in px-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Home
        </button>

        <div className="game-card border-2 border-primary/30 space-y-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-2">Choose Your Game</h2>
            <p className="text-muted-foreground">Create a new lobby or join an existing one</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="game-card bg-muted/50 h-32 flex items-center justify-center border-2 border-primary/50">
                <div className="text-center">
                  <p className="text-6xl mb-2">🎮</p>
                  <p className="text-sm text-muted-foreground">Host Your Own</p>
                </div>
              </div>
              <GameButton
                variant="primary"
                size="lg"
                className="w-full"
                glow
                onClick={() => setMode("create")}
              >
                Create Lobby
              </GameButton>
            </div>

            <div className="space-y-4">
              <div className="game-card bg-muted/50 h-32 flex items-center justify-center border-2 border-secondary/50">
                <div className="text-center">
                  <p className="text-6xl mb-2">🚀</p>
                  <p className="text-sm text-muted-foreground">Jump Right In</p>
                </div>
              </div>
              <GameButton
                variant="secondary"
                size="lg"
                className="w-full"
                glow
                onClick={() => setMode("join")}
              >
                Join Lobby
              </GameButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
