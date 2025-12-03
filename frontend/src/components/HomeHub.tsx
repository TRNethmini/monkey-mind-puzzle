import { Play, Settings, HelpCircle, Info, LogOut, User } from "lucide-react";
import { GameButton } from "@/components/ui/game-button";

interface HomeHubProps {
  onPlay: () => void;
  onSettings: () => void;
  onHowToPlay: () => void;
  onAbout: () => void;
  onLogout: () => void;
  userName?: string;
  userAvatar?: string;
}

export function HomeHub({ onPlay, onSettings, onHowToPlay, onAbout, onLogout, userName, userAvatar }: HomeHubProps) {
  return (
    <div className="flex flex-col h-full particles-bg">
      {/* User Profile Bar */}
      <div className="p-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-primary/40 bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName || 'Player avatar'}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 text-white" />
            )}
          </div>
          <div>
            <p className="font-bold">{userName || "Player"}</p>
            <p className="text-xs text-muted-foreground">Ready to play!</p>
          </div>
        </div>
        <GameButton
          variant="outline"
          size="sm"
          onClick={onLogout}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </GameButton>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-12 animate-fade-in">
          <div className="space-y-4">
            <h1 className="text-7xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent animate-float">
              MONKEY MIND
            </h1>
            <p className="text-xl text-muted-foreground">
              Go Bananas! 🍌 Swing into a fast-paced puzzle race where only the sharpest minds survive the jungle.
            </p>
          </div>

        <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
          <GameButton
            variant="primary"
            size="xl"
            glow
            onClick={onPlay}
            className="flex items-center justify-center gap-3"
          >
            <Play className="h-8 w-8" />
            <span>Play</span>
          </GameButton>

          <GameButton
            variant="outline"
            size="xl"
            onClick={onSettings}
            className="flex items-center justify-center gap-3"
          >
            <Settings className="h-8 w-8" />
            <span>Settings</span>
          </GameButton>

          <GameButton
            variant="outline"
            size="xl"
            onClick={onHowToPlay}
            className="flex items-center justify-center gap-3"
          >
            <HelpCircle className="h-8 w-8" />
            <span>How To Play</span>
          </GameButton>

          <GameButton
            variant="outline"
            size="xl"
            onClick={onAbout}
            className="flex items-center justify-center gap-3"
          >
            <Info className="h-8 w-8" />
            <span>About</span>
          </GameButton>
          </div>
        </div>
      </div>
    </div>
  );
}
