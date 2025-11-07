import { useState, useEffect } from "react";
import { Timer, Trophy, ImageIcon, LogOut } from "lucide-react";
import { GameButton } from "@/components/ui/game-button";
import { Input } from "@/components/ui/input";
import { socketService } from "@/services/socketService";
import { apiService } from "@/services/apiService";
import { toast } from "sonner";

interface GameScreenProps {
  onGameEnd: (scores: any[]) => void;
  onLeaveGame: () => void;
  lobbyCode: string;
}

interface Question {
  questionId: string;
  questionNumber: number;
  totalQuestions: number;
  type: 'visual' | 'text';
  questionImageUrl?: string;
  prompt?: string;
  choices?: string[];
  timeLimit: number;
  category?: string;
  difficulty?: string;
}

interface Player {
  userId: string;
  name: string;
  score: number;
  avatarUrl?: string;
}

interface AnswerResult {
  isCorrect: boolean;
  correctAnswer: string;
  scoreGained: number;
  timeBonus?: number;
}

export function GameScreen({ onGameEnd, onLeaveGame, lobbyCode }: GameScreenProps) {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [answer, setAnswer] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    // Watch for the game start event
    socket.on('gameStart', (data: any) => {
      console.log('[Game] Game started:', data);
    });

    // Watch for new questions from the server
    socket.on('newQuestion', (data: Question) => {
      console.log('[Game] New question:', data);
      setCurrentQuestion(data);
      setTimeLeft(data.timeLimit);
      setQuestionStartTime(Date.now());
      setAnswer("");
      setAnswerResult(null);
      setHasAnswered(false);
      if (data.type === 'visual') {
        setIsLoadingImage(true);
      }
    });

    // Hear back about our submitted answer
    socket.on('answerResult', (data: AnswerResult) => {
      console.log('[Game] Answer result:', data);
      setAnswerResult(data);
      setHasAnswered(true);
    });

    // Stay in sync with the scoreboard
    socket.on('scoreUpdate', (data: { players: Player[] }) => {
      console.log('[Game] Score update:', data);
      setPlayers(data.players);
    });

    // Wrap up when the game ends
    socket.on('gameEnd', (data: any) => {
      console.log('[Game] Game ended:', data);
      const mappedResults = Array.isArray(data.results)
        ? data.results.map((result: any) => ({
            id: result.userId || result.id,
            name: result.name,
            score: result.score,
            avatarUrl: result.avatarUrl,
            rank: result.rank,
          }))
        : [];
      onGameEnd(mappedResults);
    });

    // Join the lobby room so we get updates
    socket.emit('joinLobby', { code: lobbyCode });

    return () => {
      socket.off('gameStart');
      socket.off('newQuestion');
      socket.off('answerResult');
      socket.off('scoreUpdate');
      socket.off('gameEnd');
    };
  }, [lobbyCode, onGameEnd]);

  // Keep track of the countdown clock
  useEffect(() => {
    if (!currentQuestion || hasAnswered) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQuestion, hasAnswered]);

  const handleSubmit = () => {
    if (!currentQuestion || !answer || hasAnswered) return;

    const timeToAnswer = Date.now() - questionStartTime;
    
    socketService.emit('submitAnswer', {
      questionId: currentQuestion.questionId,
      answer: answer.trim(),
      timeToAnswer,
    });

    setHasAnswered(true);
  };

  const handleLeaveGame = async () => {
    const token = localStorage.getItem('token') || '';
    try {
      await apiService.leaveLobby(token, lobbyCode);
      socketService.emit('leaveLobby', { code: lobbyCode });
      toast.success('Left the game');
      onLeaveGame();
    } catch (error) {
      console.error('Leave game error:', error);
      onLeaveGame();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!currentQuestion) {
    return (
      <div className="h-full flex items-center justify-center particles-bg">
        <div className="game-card text-center space-y-4">
          <h2 className="text-2xl font-bold">Waiting for game to start...</h2>
          <p className="text-muted-foreground">Get ready!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col particles-bg">
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <Timer className="h-6 w-6 text-primary" />
          <span className="text-2xl font-bold">{formatTime(timeLeft)}</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Round</div>
            <div className="text-2xl font-bold text-primary">
              {currentQuestion.questionNumber}/{currentQuestion.totalQuestions}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{currentQuestion.category || 'General'}</span>
            {currentQuestion.difficulty && (
              <span className="capitalize px-2 py-1 rounded bg-primary/10">
                {currentQuestion.difficulty}
              </span>
            )}
          </div>
          <GameButton
            variant="outline"
            size="sm"
            onClick={() => setShowLeaveConfirm(true)}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Leave</span>
          </GameButton>
        </div>
      </div>

      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        <div className="flex-1 flex flex-col justify-center">
          <div className="game-card border-2 border-primary/30 space-y-8 max-w-3xl mx-auto w-full">
            {/* Show the visual puzzle */}
            {currentQuestion.type === 'visual' && currentQuestion.questionImageUrl && (
              <>
                <div className="flex items-center justify-center gap-2 text-primary">
                  <ImageIcon className="h-6 w-6" />
                  <h3 className="text-xl font-bold">Visual Puzzle</h3>
                </div>

                <div className="relative rounded-lg overflow-hidden bg-muted/30 min-h-[300px] flex items-center justify-center">
                  {isLoadingImage && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                  )}
                  <img
                    src={currentQuestion.questionImageUrl}
                    alt="Puzzle"
                    className="max-w-full max-h-[400px] object-contain"
                    onLoad={() => setIsLoadingImage(false)}
                    onError={() => setIsLoadingImage(false)}
                  />
                </div>

                <p className="text-center text-muted-foreground">
                  Study the pattern and enter your answer below
                </p>
              </>
            )}

            {/* Show the text-based question */}
            {currentQuestion.type === 'text' && currentQuestion.prompt && (
              <>
                <h2 className="text-3xl font-bold text-center">{currentQuestion.prompt}</h2>

                {currentQuestion.choices && (
                  <div className="grid grid-cols-2 gap-4">
                    {currentQuestion.choices.map((option, index) => (
                      <GameButton
                        key={index}
                        variant={answer === option ? "primary" : "outline"}
                        size="lg"
                        className="h-24 text-lg"
                        onClick={() => setAnswer(option)}
                        disabled={hasAnswered}
                      >
                        {option}
                      </GameButton>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Answer entry area */}
            <div className="space-y-4">
              <Input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={currentQuestion.type === 'visual' ? "Enter your answer (number or letter)..." : "Or type your answer..."}
                className="bg-muted border-border focus:border-primary text-lg text-center font-bold"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                disabled={hasAnswered}
              />

              {/* Feedback after sending an answer */}
              {answerResult && (
                <div className={`p-4 rounded-lg ${
                  answerResult.isCorrect 
                    ? 'bg-green-500/10 border-2 border-green-500' 
                    : 'bg-red-500/10 border-2 border-red-500'
                }`}>
                  <div className="text-center space-y-2">
                    <p className="text-xl font-bold">
                      {answerResult.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Answer: <span className="font-bold">{answerResult.correctAnswer}</span>
                    </p>
                    {answerResult.isCorrect && (
                      <p className="text-lg font-bold text-primary">
                        +{answerResult.scoreGained} points
                        {answerResult.timeBonus && ` (${answerResult.timeBonus} time bonus!)`}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <GameButton
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleSubmit}
                glow
                disabled={!answer || hasAnswered}
              >
                {hasAnswered ? 'Waiting for next question...' : 'Submit Answer'}
              </GameButton>
            </div>
          </div>
        </div>

        {/* Leaderboard column */}
        <div className="w-80 game-card border-2 border-secondary/30 space-y-4 h-fit">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-secondary" />
            <h3 className="text-xl font-bold">Leaderboard</h3>
          </div>

          <div className="space-y-3">
            {players.length > 0 ? (
              [...players]
                .sort((a, b) => b.score - a.score)
                .map((player, index) => (
                  <div
                    key={player.userId}
                    className={`game-card bg-muted/50 flex items-center gap-3 ${
                      index === 0 ? "border-2 border-primary" : "border border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-white">
                        {index + 1}
                      </div>
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-primary/30 bg-muted/40 flex items-center justify-center">
                        {player.avatarUrl ? (
                          <img
                            src={player.avatarUrl}
                            alt={`${player.name}'s avatar`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold text-primary">{getInitials(player.name)}</span>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="font-bold">{player.name}</div>
                        <div className="text-sm text-muted-foreground">{player.score} pts</div>
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center text-muted-foreground py-4">
                Waiting for players...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm before leaving the game */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="game-card max-w-md w-full border-2 border-primary/30 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <LogOut className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Leave Game?</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to leave? Your progress will be lost and you won't be able to rejoin this game.
            </p>
            <div className="flex gap-3">
              <GameButton
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => setShowLeaveConfirm(false)}
              >
                Cancel
              </GameButton>
              <GameButton
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={handleLeaveGame}
              >
                Leave Game
              </GameButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
