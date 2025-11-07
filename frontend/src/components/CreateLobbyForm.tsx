import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { GameButton } from "@/components/ui/game-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { apiService } from "@/services/apiService";

interface CreateLobbyFormProps {
  onBack: () => void;
  onSuccess: (lobbyCode: string) => void;
}

export function CreateLobbyForm({ onBack, onSuccess }: CreateLobbyFormProps) {
  const [lobbyName, setLobbyName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isPublic, setIsPublic] = useState(true);
  const [questionCount, setQuestionCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token') || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!lobbyName.trim()) {
      toast.error("Please enter a lobby name");
      return;
    }

    setLoading(true);
    
    try {
      const result = await apiService.createLobby(token, {
        name: lobbyName,
        maxPlayers,
        isPublic,
        settings: {
          questionCount,
          questionTimeLimit: 30,
          difficulty: 'medium'
        }
      });

      if (result.success && result.data?.lobby?.code) {
        toast.success("Lobby created!");
        onSuccess(result.data.lobby.code);
      } else {
        toast.error(result.error || result.message || "Failed to create lobby");
        setLoading(false);
      }
    } catch (error) {
      toast.error("Failed to create lobby");
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-full particles-bg">
      <div className="w-full max-w-2xl space-y-8 animate-fade-in px-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>

        <form onSubmit={handleSubmit} className="game-card border-2 border-primary/30 space-y-6">
          <h2 className="text-3xl font-bold">Create Lobby</h2>

          <div className="space-y-2">
            <Label htmlFor="lobbyName">Lobby Name</Label>
            <Input
              id="lobbyName"
              value={lobbyName}
              onChange={(e) => setLobbyName(e.target.value)}
              placeholder="My Awesome Lobby"
              maxLength={30}
              className="bg-muted border-border focus:border-primary"
            />
          </div>

          <div className="space-y-2">
            <Label>Max Players: {maxPlayers}</Label>
            <Slider
              value={[maxPlayers]}
              onValueChange={([value]) => setMaxPlayers(value)}
              min={2}
              max={8}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>Questions: {questionCount}</Label>
            <Slider
              value={[questionCount]}
              onValueChange={([value]) => setQuestionCount(value)}
              min={5}
              max={20}
              step={5}
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="isPublic">Public Lobby</Label>
            <Switch
              id="isPublic"
              checked={isPublic}
              onCheckedChange={setIsPublic}
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
            Create Lobby
          </GameButton>
        </form>
      </div>
    </div>
  );
}
