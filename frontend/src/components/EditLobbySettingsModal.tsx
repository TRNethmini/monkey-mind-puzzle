import { useState } from "react";
import { X, Settings } from "lucide-react";
import { GameButton } from "@/components/ui/game-button";

interface EditLobbySettingsModalProps {
  open: boolean;
  onClose: () => void;
  currentSettings: {
    maxPlayers: number;
    questionCount: number;
    questionTimeLimit: number;
    difficulty: string;
    isPublic: boolean;
    name: string;
  };
  onSave: (settings: {
    maxPlayers: number;
    questionCount: number;
    questionTimeLimit: number;
    difficulty: string;
    isPublic: boolean;
    name: string;
  }) => void;
}

export function EditLobbySettingsModal({
  open,
  onClose,
  currentSettings,
  onSave,
}: EditLobbySettingsModalProps) {
  const [settings, setSettings] = useState(currentSettings);

  if (!open) return null;

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="game-card max-w-2xl w-full border-2 border-primary/30 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Edit Lobby Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Lobby Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Lobby Name
            </label>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              maxLength={50}
            />
          </div>

          {/* Max Players */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Max Players: {settings.maxPlayers}
            </label>
            <input
              type="range"
              min="2"
              max="8"
              value={settings.maxPlayers}
              onChange={(e) =>
                setSettings({ ...settings, maxPlayers: parseInt(e.target.value) })
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>2</span>
              <span>8</span>
            </div>
          </div>

          {/* Question Count */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Number of Questions: {settings.questionCount}
            </label>
            <input
              type="range"
              min="3"
              max="20"
              value={settings.questionCount}
              onChange={(e) =>
                setSettings({ ...settings, questionCount: parseInt(e.target.value) })
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>3</span>
              <span>20</span>
            </div>
          </div>

          {/* Time Limit */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Time per Question: {settings.questionTimeLimit}s
            </label>
            <input
              type="range"
              min="5"
              max="60"
              step="5"
              value={settings.questionTimeLimit}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  questionTimeLimit: parseInt(e.target.value),
                })
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>5s</span>
              <span>60s</span>
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium mb-2">Difficulty</label>
            <select
              value={settings.difficulty}
              onChange={(e) =>
                setSettings({ ...settings, difficulty: e.target.value })
              }
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Visibility */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Public Lobby</label>
            <button
              onClick={() =>
                setSettings({ ...settings, isPublic: !settings.isPublic })
              }
              className={`relative w-14 h-7 rounded-full transition-colors ${
                settings.isPublic ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.isPublic ? "translate-x-7" : ""
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <GameButton
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </GameButton>
          <GameButton
            variant="primary"
            size="lg"
            className="flex-1"
            onClick={handleSave}
            glow
          >
            Save Changes
          </GameButton>
        </div>
      </div>
    </div>
  );
}

