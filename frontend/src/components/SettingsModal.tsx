import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: {
    audio: boolean;
    volume: number;
    textSize: number;
  };
  onSettingsChange: (settings: any) => void;
}

export function SettingsModal({ open, onClose, settings, onSettingsChange }: SettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md game-card border-2 border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="audio" className="text-base">Background Music</Label>
              <p className="text-xs text-muted-foreground">Toggle the ambient jungle soundtrack.</p>
            </div>
            <Switch
              id="audio"
              checked={settings.audio}
              onCheckedChange={(checked) =>
                onSettingsChange({ ...settings, audio: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base">Music Volume</Label>
            <Slider
              value={[settings.volume]}
              onValueChange={([value]) =>
                onSettingsChange({ ...settings, volume: value })
              }
              max={100}
              step={1}
              disabled={!settings.audio}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base">Text Size</Label>
            <Slider
              value={[settings.textSize]}
              onValueChange={([value]) =>
                onSettingsChange({ ...settings, textSize: value })
              }
              min={12}
              max={24}
              step={2}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground" style={{ fontSize: `${settings.textSize}px` }}>
              Sample text preview
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
