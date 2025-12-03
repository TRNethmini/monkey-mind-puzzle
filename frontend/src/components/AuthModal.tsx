import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GameButton } from "@/components/ui/game-button";
import { apiService } from "@/services/apiService";
import { toast } from "sonner";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

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
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Debug: Log if Google Client ID is available
  useEffect(() => {
    if (open) {
      console.log('[AuthModal] Google Client ID:', googleClientId ? `Set: ${googleClientId.substring(0, 20)}...` : 'Not set');
      console.log('[AuthModal] Google Client ID (full):', googleClientId);
      console.log('[AuthModal] Google script loaded:', !!window.google);
      console.log('[AuthModal] All env vars:', import.meta.env);
    }
  }, [open, googleClientId]);

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

  const handleGoogleSignIn = useCallback(async (credential: string) => {
    setLoading(true);
    try {
      const result = await apiService.googleLogin(credential);
      if (result.success && result.data?.token && result.data?.user) {
        toast.success("Signed in with Google!");
        onSuccess(result.data.token, result.data.user);
        onClose();
      } else {
        toast.error(result.error || result.message || "Google authentication failed");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [onSuccess, onClose]);

  const handleGoogleButtonClick = useCallback(() => {
    if (!window.google?.accounts?.id || !googleReady) {
      toast.error("Google Sign-In is not ready. Please try again.");
      return;
    }
    
    // Try to click the hidden Google button first
    if (googleButtonRef.current) {
      const googleButton = googleButtonRef.current.querySelector('div[role="button"], iframe') as HTMLElement;
      if (googleButton) {
        // Create a synthetic click event
        const clickEvent = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true,
        });
        googleButton.dispatchEvent(clickEvent);
        return;
      }
    }
    
    // Fallback: Use prompt method (shows One Tap popup)
    try {
      window.google.accounts.id.prompt();
    } catch (error) {
      console.error('[AuthModal] Error triggering Google Sign-In:', error);
      // Try clicking the button as last resort
      const button = googleButtonRef.current?.querySelector('div[role="button"]') as HTMLElement;
      if (button) {
        button.click();
      } else {
        toast.error("Failed to start Google Sign-In. Please try again.");
      }
    }
  }, [googleReady]);

  useEffect(() => {
    if (!open) return;
    if (!googleClientId) {
      setGoogleReady(false);
      return;
    }

    // Wait for Google script to load
    let checkGoogle: NodeJS.Timeout;
    let timeout: NodeJS.Timeout;

    const initGoogle = () => {
      if (!window.google?.accounts?.id) {
        console.warn('[AuthModal] Google script not available');
        return false;
      }

      try {
        // Initialize Google Sign-In first (this doesn't need the button ref)
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response: { credential: string }) => {
            handleGoogleSignIn(response.credential);
          },
        });

        // Set ready state immediately - we can use prompt() even without rendering the button
        setGoogleReady(true);
        console.log('[AuthModal] ✅ Google Sign-In initialized successfully');

        // Try to render the hidden button if ref is available (for programmatic clicks)
        const renderButton = () => {
          if (googleButtonRef.current) {
            try {
              googleButtonRef.current.innerHTML = '';
              window.google.accounts.id.renderButton(googleButtonRef.current, {
                type: 'standard',
                theme: 'outline',
                size: 'large',
                text: 'signin_with',
                width: 300,
              });

              // Hide the Google button visually but keep it in DOM for programmatic clicks
              googleButtonRef.current.style.position = 'absolute';
              googleButtonRef.current.style.opacity = '0';
              googleButtonRef.current.style.pointerEvents = 'none';
              googleButtonRef.current.style.width = '0';
              googleButtonRef.current.style.height = '0';
              googleButtonRef.current.style.overflow = 'hidden';
            } catch (error) {
              console.warn('[AuthModal] Could not render hidden button, will use prompt() instead:', error);
            }
          } else {
            // Retry after a short delay if ref not ready
            setTimeout(renderButton, 100);
          }
        };

        // Try to render the button
        renderButton();
        
        return true;
      } catch (error) {
        console.error('[AuthModal] ❌ Error initializing Google Sign-In:', error);
        setGoogleReady(false);
        return false;
      }
    };

    // Check if Google script is already loaded
    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      // Wait for Google script to load
      checkGoogle = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(checkGoogle);
          if (timeout) clearTimeout(timeout);
          initGoogle();
        }
      }, 100);

      // Timeout after 10 seconds
      timeout = setTimeout(() => {
        clearInterval(checkGoogle);
        if (!window.google) {
          console.error('[AuthModal] Google script failed to load. Make sure the script tag is in index.html');
          setGoogleReady(false);
        }
      }, 10000);
    }

    return () => {
      if (checkGoogle) clearInterval(checkGoogle);
      if (timeout) clearTimeout(timeout);
    };
  }, [open, googleClientId, handleGoogleSignIn]);

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

            {googleClientId && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                {/* Hidden container for Google's button */}
                <div 
                  ref={googleButtonRef} 
                  className="hidden"
                />

                <GameButton
                  type="button"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  glow
                  onClick={handleGoogleButtonClick}
                  disabled={loading || !googleReady}
                >
                  {googleReady ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue with Google
                    </span>
                  ) : (
                    "Loading Google Sign-In..."
                  )}
                </GameButton>
              </>
            )}

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
