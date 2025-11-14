import { Trophy, Medal, Frown } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { GameButton } from "@/components/ui/game-button";

interface EndGameModalProps {
  open: boolean;
  scores: Array<{ id: string; name: string; score: number; avatarUrl?: string; rank?: number }>;
  onPlayAgain: () => void;
  onReturnHome: () => void;
}

export function EndGameModal({ open, scores, onPlayAgain, onReturnHome }: EndGameModalProps) {
  // Quick guard: nothing to show if we lack scores
  if (!scores || scores.length === 0) {
    return null;
  }

  const sortedScores = [...scores].sort((a, b) => b.score - a.score);
  const winner = sortedScores[0];
  const loser = sortedScores[sortedScores.length - 1];

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-2xl game-card border-2 border-primary/30 animate-fade-in">
        <div className="space-y-8 py-4">
          <div className="text-center space-y-4">
            <Trophy className="h-20 w-20 text-secondary mx-auto animate-pulse-glow" />
            <div>
              <h2 className="text-4xl font-bold mb-2">Game Over!</h2>
              {winner && (
                <p className="text-xl text-muted-foreground">
                  <span className="text-secondary font-bold">{winner.name}</span> Wins! All hail the new Banana King! 
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {sortedScores.map((player, index) => (
              <div
                key={player.id ?? `${player.name}-${index}`}
                className={`game-card flex items-center gap-4 ${
                  index === 0
                    ? "bg-gradient-to-r from-primary/20 to-secondary/20 border-2 border-primary"
                    : "bg-muted/50 border border-border"
                }`}
              >
                <div className="text-4xl flex flex-col items-center justify-center min-w-[40px]">
                  {index === 0 && <Trophy className="h-8 w-8 text-secondary" />}
                  {index === 1 && <Medal className="h-8 w-8 text-muted-foreground" />}
                  {index === sortedScores.length - 1 && index > 1 && (
                    <Frown className="h-8 w-8 text-destructive" />
                  )}
                  {index > 1 && index !== sortedScores.length - 1 && (
                    <span className="text-muted-foreground text-lg">{player.rank ?? index + 1}</span>
                  )}
                </div>

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
                  <div className="font-bold text-lg">{player.name}</div>
                  <div className="text-muted-foreground">{player.score} points</div>
                </div>
              </div>
            ))}
          </div>

          {loser && loser.name && sortedScores.length > 1 && (
            <div className="game-card bg-destructive/10 border-destructive/30">
              <p className="text-xl font-bold text-center">
                <span className="font-bold text-lg">{loser.name}</span> gets the dare challenge!
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <GameButton variant="outline" size="lg" onClick={onReturnHome}>
              Return Home
            </GameButton>
            <GameButton variant="primary" size="lg" onClick={onPlayAgain} glow>
              Play Again
            </GameButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
