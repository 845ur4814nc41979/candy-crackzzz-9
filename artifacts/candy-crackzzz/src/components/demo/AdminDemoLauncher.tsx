import { useEffect, useMemo, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import GuidedTour from '@/components/demo/GuidedTour';
import { tourForAdminRole } from '@/lib/demoTours';
import {
  dismissPrompt,
  loadDemoState,
  markTourSeen,
} from '@/lib/demoMode';

interface AdminDemoLauncherProps {
  /**
   * When `auto` is true, the launcher will offer the first-login prompt
   * automatically. Set to false to render only a manual button (e.g. on a
   * "Replay tour" trigger).
   */
  auto?: boolean;
  /** Renders a small button that opens the tour on demand. */
  trigger?: 'icon' | 'text' | 'none';
  className?: string;
}

export default function AdminDemoLauncher({ auto = true, trigger = 'icon', className }: AdminDemoLauncherProps) {
  const { currentUser } = useAuth();
  const scope = currentUser?.id ?? 'guest';
  const tour = useMemo(() => tourForAdminRole(currentUser?.role), [currentUser?.role]);

  const [showPrompt, setShowPrompt] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    if (!auto || !currentUser) return undefined;
    const state = loadDemoState(scope);
    const alreadySeen = tour.id === 'delivery' ? state.hasSeenDeliveryTour : state.hasSeenAdminTour;
    if (alreadySeen || state.dismissedDemoPrompt) return undefined;
    // Small delay so it doesn't slam in while the dashboard is mounting.
    const timer = window.setTimeout(() => setShowPrompt(true), 500);
    return () => window.clearTimeout(timer);
  }, [auto, currentUser, scope, tour.id]);

  const handleStart = () => {
    setShowPrompt(false);
    setTourOpen(true);
  };

  const handleSkip = () => {
    setShowPrompt(false);
    dismissPrompt(scope, false);
  };

  const handleNeverAgain = () => {
    setShowPrompt(false);
    dismissPrompt(scope, true);
  };

  const handleComplete = () => {
    markTourSeen(scope, tour.id);
  };

  const triggerButton =
    trigger === 'none' ? null : trigger === 'text' ? (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setTourOpen(true)}
        className={`font-black uppercase tracking-wider ${className ?? ''}`}
        data-testid="button-admin-demo-launch"
      >
        <Sparkles className="w-4 h-4 mr-1" /> Guided Demo
      </Button>
    ) : (
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => setTourOpen(true)}
        title="Start guided tour"
        aria-label="Start guided tour"
        className={`text-muted-foreground hover:text-primary ${className ?? ''}`}
        data-testid="button-admin-demo-launch"
      >
        <Sparkles className="w-5 h-5" />
      </Button>
    );

  return (
    <>
      {triggerButton}

      {showPrompt && currentUser && (
        <div
          className="fixed inset-0 z-[190] flex items-end md:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          data-testid="admin-demo-prompt"
          onClick={handleSkip}
        >
          <div
            className="relative w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl shadow-primary/20 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={handleSkip}
              className="absolute top-3 right-3 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-background z-10"
              data-testid="button-admin-demo-prompt-close"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-6 md:p-7">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Welcome, {currentUser.username}
                  </div>
                  <h2 className="text-xl font-black uppercase tracking-tight">
                    Want a quick guided tour?
                  </h2>
                </div>
              </div>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed mb-5">
                {tour.intro} Demo mode never sends real notifications, charges money, or reveals any private keys.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  onClick={handleStart}
                  className="flex-1 font-black uppercase tracking-wider"
                  data-testid="button-admin-demo-start"
                >
                  Start Demo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkip}
                  className="flex-1 font-black uppercase tracking-wider"
                  data-testid="button-admin-demo-skip"
                >
                  Skip for Now
                </Button>
              </div>
              <button
                type="button"
                onClick={handleNeverAgain}
                className="w-full mt-3 text-xs font-bold text-muted-foreground hover:text-foreground"
                data-testid="button-admin-demo-never"
              >
                Don’t show again
              </button>
            </div>
          </div>
        </div>
      )}

      <GuidedTour
        tour={tour}
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        onComplete={handleComplete}
      />
    </>
  );
}
