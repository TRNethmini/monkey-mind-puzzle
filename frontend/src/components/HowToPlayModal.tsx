import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GameButton } from "@/components/ui/game-button";

interface HowToPlayModalProps {
  open: boolean;
  onClose: () => void;
}

export function HowToPlayModal({ open, onClose }: HowToPlayModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl game-card border-2 border-primary/30 max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">How To Play</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="space-y-4">
            <div className="game-card bg-muted/50 border-l-4 border-primary">
              <h3 className="font-bold text-lg mb-2">1. Create or Join a Lobby</h3>
              <p className="text-muted-foreground">
                Start by creating your own game lobby or joining an existing one using a lobby code.
                You can also browse public lobbies to find a game to join.
              </p>
            </div>

            <div className="game-card bg-muted/50 border-l-4 border-secondary">
              <h3 className="font-bold text-lg mb-2">2. Wait for Players</h3>
              <p className="text-muted-foreground">
                Once in a lobby, wait for other players to join. The lobby owner can start the game
                when everyone is ready. Games require 2-4 players.
              </p>
            </div>

            <div className="game-card bg-muted/50 border-l-4 border-accent">
              <h3 className="font-bold text-lg mb-2">3. Answer Questions</h3>
              <p className="text-muted-foreground">
                When the game starts, you'll be presented with puzzles and questions. Answer as quickly
                and accurately as possible to earn points. Speed matters!
              </p>
            </div>

            <div className="game-card bg-muted/50 border-l-4 border-primary">
              <h3 className="font-bold text-lg mb-2">4. Win the Match</h3>
              <p className="text-muted-foreground">
                The player with the highest score at the end wins! But watch out - the lowest-scoring
                player might face a dare from the other players.
              </p>
            </div>
          </div>

          <div className="pt-4">
            <GameButton variant="primary" size="lg" onClick={onClose} className="w-full">
              Got It!
            </GameButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
