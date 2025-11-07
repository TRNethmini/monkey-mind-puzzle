import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GameButton } from "@/components/ui/game-button";
import { apiService } from "@/services/apiService";
import { toast } from "sonner";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (token: string, user: { id: string; name: string; avatarUrl: string }) => void;
}

export function AuthModal({ open, onClose, onSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }

    setLoading(true);
    
    try {
      const result = isLogin
        ? await apiService.login(name, pin)
        : await apiService.register(name, pin);

      if (result.success && result.data?.token && result.data?.user) {
        toast.success(isLogin ? "Welcome back!" : "Account created!");
        onSuccess(result.data.token, result.data.user);
        onClose();
      } else {
        toast.error(result.error || result.message || "Authentication failed");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (value: string) => {
    if (/^\d{0,4}$/.test(value)) {
      setPin(value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md game-card border-2 border-primary/30 animate-fade-in">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            {isLogin ? "Welcome Back" : "Join the Game"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-base">Player Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
              className="bg-muted border-border focus:border-primary text-lg"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pin" className="text-base">4-Digit PIN</Label>
            <Input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              placeholder="••••"
              maxLength={4}
              className="bg-muted border-border focus:border-primary text-2xl tracking-widest text-center"
              disabled={loading}
            />
          </div>

          <div className="space-y-3">
            <GameButton
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              glow
              loading={loading}
            >
              {isLogin ? "Login" : "Register"}
            </GameButton>

            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              disabled={loading}
            >
              {isLogin ? "Need an account? Register" : "Already have an account? Login"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
