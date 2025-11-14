import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

export function AboutModal({ open, onClose }: AboutModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md game-card border-2 border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            About Monkey Mind
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4 text-center">
          <div className="text-6xl mb-4 animate-float">🎯
</div>
          
          <p className="text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Monkey Mind is a fast-paced multiplayer puzzle game where quick thinking and sharp reflexes lead to victory.</strong> 
          </p>

          <p className="text-sm text-muted-foreground">
            This project was developed by K.A.T.Ridmi Nethmini as a Final Year Project for the University of Bedfordshire.
          </p>

          <p className="text-sm text-muted-foreground">
            🛠 Tech Stack: React, TypeScript, Tailwind CSS, and Socket.IO
          </p>

          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Version 1.0.0 • 2025
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
