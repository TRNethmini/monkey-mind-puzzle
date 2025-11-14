import { useState, useEffect, useRef } from "react";
import { AuthModal } from "@/components/AuthModal";
import { HomeHub } from "@/components/HomeHub";
import { LobbySelector } from "@/components/LobbySelector";
import { LobbyRoom } from "@/components/LobbyRoom";
import { GameScreen } from "@/components/GameScreen";
import { EndGameModal } from "@/components/EndGameModal";
import { SettingsModal } from "@/components/SettingsModal";
import { HowToPlayModal } from "@/components/HowToPlayModal";
import { AboutModal } from "@/components/AboutModal";
import { socketService } from "@/services/socketService";

type GameState = "auth" | "home" | "lobby-select" | "lobby-room" | "game" | "end";

interface User {
  id: string;
  name: string;
  avatarUrl: string;
}

interface ScoreEntry {
  id: string;
  name: string;
  score: number;
  avatarUrl?: string;
  rank?: number;
}

const defaultSettings = {
  audio: true,
  volume: 70,
  textSize: 16,
};

const Index = () => {
  const [gameState, setGameState] = useState<GameState>("auth");
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [lobbyCode, setLobbyCode] = useState<string>("");
  const [gameScores, setGameScores] = useState<ScoreEntry[]>([]);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showEndGame, setShowEndGame] = useState(false);

  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('monkey-mind-settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...defaultSettings, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load settings from storage', error);
    }
    return defaultSettings;
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('monkey-mind-settings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to persist settings', error);
    }
  }, [settings]);

  useEffect(() => {
    const audio = new Audio('/audio/music.mp3');
    audio.loop = true;
    audioRef.current = audio;

    // Try to start the music based on saved settings
    audio.volume = (settings.volume ?? defaultSettings.volume) / 100;
    if (settings.audio) {
      audio.play().catch(() => {
        console.warn('Autoplay blocked until user interaction');
      });
    }

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = settings.volume / 100;

    if (settings.audio) {
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch(() => {
          console.warn('Unable to start background music automatically');
        });
      }
    } else {
      audio.pause();
    }
  }, [settings.audio, settings.volume]);

  useEffect(() => {
    // See if we already have login info saved
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setGameState("home");
    }
  }, []);

  useEffect(() => {
    if (token && user) {
      socketService.connect(token);
    }

    return () => {
      socketService.disconnect();
    };
  }, [token, user]);

  const handleAuthSuccess = (authToken: string, authUser: User) => {
    setToken(authToken);
    setUser(authUser);
    
    // Remember the token so other calls can use it
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(authUser));
    
    setGameState("home");
  };

  const handleLobbyJoined = (code: string) => {
    setLobbyCode(code);
    setGameState("lobby-room");
  };

  const handleStartGame = () => {
    setGameState("game");
  };

  const handleGameEnd = (scores: ScoreEntry[]) => {
    setGameScores(scores);
    setShowEndGame(true);
    setGameState("end");
  };

  const handlePlayAgain = () => {
    setShowEndGame(false);
    setGameState("lobby-select");
  };

  const handleReturnHome = () => {
    setShowEndGame(false);
    setGameState("home");
  };

  const handleLogout = () => {
    // Wipe saved login details
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    socketService.disconnect();
    setGameState("auth");
  };

  return (
    <div className="h-screen w-screen overflow-hidden text-foreground relative">
      {/* Show the login background video */}
      {gameState === "auth" && (
        <video
          key="login-video"
          autoPlay
          loop
          muted
          playsInline
          className="fixed inset-0 w-full h-full object-cover opacity-40"
          style={{ 
            zIndex: -20,
            filter: 'blur(2px) brightness(0.6)'
          }}
        >
          <source src="/videos/LoginReg.mp4" type="video/mp4" />
        </video>
      )}

      {/* Show the in-game background video */}
      {gameState !== "auth" && (
        <video
          key="game-video"
          autoPlay
          loop
          muted
          playsInline
          className="fixed inset-0 w-full h-full object-cover opacity-70"
          style={{ 
            zIndex: -20,
            filter: 'blur(3px) brightness(0.7)'
          }}
        >
          <source src="/videos/LoginReg.mp4" type="video/mp4" />
        </video>
      )}

      {/* Add a dark overlay so text stays readable */}
      <div 
        className="fixed inset-0 bg-black/40"
        style={{ zIndex: -10 }}
      />

      <AuthModal
        open={gameState === "auth"}
        onClose={() => {}}
        onSuccess={handleAuthSuccess}
      />

      {gameState === "home" && (
        <HomeHub
          onPlay={() => setGameState("lobby-select")}
          onSettings={() => setShowSettings(true)}
          onHowToPlay={() => setShowHowToPlay(true)}
          onAbout={() => setShowAbout(true)}
          onLogout={handleLogout}
          userName={user?.name}
          userAvatar={user?.avatarUrl}
        />
      )}

      {gameState === "lobby-select" && (
        <LobbySelector
          onBack={() => setGameState("home")}
          onLobbyJoined={handleLobbyJoined}
        />
      )}

      {gameState === "lobby-room" && (
        <LobbyRoom
          lobbyCode={lobbyCode}
          onStartGame={handleStartGame}
          onLeaveLobby={() => setGameState("home")}
        />
      )}

      {gameState === "game" && (
        <GameScreen 
          onGameEnd={handleGameEnd} 
          onLeaveGame={() => setGameState("home")}
          lobbyCode={lobbyCode} 
        />
      )}

      <EndGameModal
        open={showEndGame}
        scores={gameScores}
        onPlayAgain={handlePlayAgain}
        onReturnHome={handleReturnHome}
      />

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />

      <HowToPlayModal
        open={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
      />

      <AboutModal
        open={showAbout}
        onClose={() => setShowAbout(false)}
      />
    </div>
  );
};

export default Index;
