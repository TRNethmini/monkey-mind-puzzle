import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface GameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "outline" | "ghost";
  size?: "sm" | "md" | "lg" | "xl";
  loading?: boolean;
  glow?: boolean;
}

const GameButton = forwardRef<HTMLButtonElement, GameButtonProps>(
  ({ className, variant = "primary", size = "md", loading, glow, disabled, children, ...props }, ref) => {
    const baseStyles = "game-button font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100";
    
    const variants = {
      primary: "bg-primary text-primary-foreground hover:brightness-110 shadow-lg",
      secondary: "bg-secondary text-secondary-foreground hover:brightness-110 shadow-lg",
      accent: "bg-accent text-accent-foreground hover:brightness-110 shadow-lg",
      outline: "border-2 border-primary text-primary bg-transparent hover:bg-primary hover:text-primary-foreground",
      ghost: "text-foreground hover:bg-muted",
    };

    const sizes = {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg",
      xl: "px-12 py-6 text-xl",
    };

    const glowStyles = glow ? (variant === "secondary" ? "glow-secondary" : "glow-primary") : "";

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], glowStyles, className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

GameButton.displayName = "GameButton";

export { GameButton };
