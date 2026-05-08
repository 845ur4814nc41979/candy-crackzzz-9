import { useEffect, useMemo, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }

  interface Navigator {
    standalone?: boolean;
  }
}

const DISMISS_KEY = 'candycrackzzz-dismiss-install-prompt-v1';

export default function AddToHomeScreenPrompt() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const isIos = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const dismissed = localStorage.getItem(DISMISS_KEY) === '1';
    const installed = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setIsInstalled(installed);

    if (!installed && isIos && !dismissed) {
      setShowPrompt(true);
    }

    const onBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setDeferredPrompt(event);
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.setItem(DISMISS_KEY, '1');
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, [isIos]);

  const dismissPrompt = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setShowPrompt(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => null);
    setDeferredPrompt(null);
    localStorage.setItem(DISMISS_KEY, '1');
    setShowPrompt(false);
  };

  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-24 z-40 md:bottom-6 md:left-auto md:right-6 md:inset-x-auto md:w-[360px]">
      <div className="rounded-2xl border border-white/10 bg-[#090A16]/95 p-4 text-white shadow-2xl backdrop-blur">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-wider text-[#57D8FF]">Add App to Home Screen</p>
            <h3 className="mt-1 text-lg font-black">Candy Crackzzz</h3>
          </div>
          <button
            type="button"
            onClick={dismissPrompt}
            className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-white/80 transition hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <p className="text-sm text-white/85">
          Add Candy Crackzzz to your home screen for faster ordering and a more app-like experience.
        </p>

        {isIos ? (
          <p className="mt-3 text-xs text-white/75">
            On iPhone or iPad, tap Share in Safari, then tap Add to Home Screen.
          </p>
        ) : deferredPrompt ? (
          <p className="mt-3 text-xs text-white/75">
            Your browser supports install. Tap the button below to add the app.
          </p>
        ) : (
          <p className="mt-3 text-xs text-white/75">
            If your browser shows an add to home screen option, you can use that to save the app.
          </p>
        )}

        <div className="mt-4 flex gap-3">
          {deferredPrompt ? (
            <button
              type="button"
              onClick={handleInstall}
              className="flex-1 rounded-xl bg-gradient-to-r from-[#57D8FF] to-[#FF38D4] px-4 py-3 text-sm font-black uppercase tracking-wide text-[#090A16]"
            >
              Add App
            </button>
          ) : (
            <button
              type="button"
              onClick={dismissPrompt}
              className="flex-1 rounded-xl bg-gradient-to-r from-[#57D8FF] to-[#FF38D4] px-4 py-3 text-sm font-black uppercase tracking-wide text-[#090A16]"
            >
              Got It
            </button>
          )}
          <button
            type="button"
            onClick={dismissPrompt}
            className="rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-white/85 transition hover:bg-white/10"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}
