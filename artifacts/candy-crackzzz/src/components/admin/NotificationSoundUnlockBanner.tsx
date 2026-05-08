import { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import {
  canPlayNotificationAudio,
  isAudioContextSupported,
  playGeneralNotificationSound,
  subscribeNotificationAudio,
  unlockNotificationAudio,
} from '@/lib/notificationSounds';

export default function NotificationSoundUnlockBanner() {
  const { isLoggedIn } = useAuth();
  const { settings } = useAppContext();
  const { toast } = useToast();
  const [audioReady, setAudioReady] = useState<boolean>(canPlayNotificationAudio());
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const refresh = () => setAudioReady(canPlayNotificationAudio());
    refresh();
    const unsub = subscribeNotificationAudio(refresh);
    const onVis = () => refresh();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      unsub();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [settings.notificationSoundsEnabled]);

  if (!isLoggedIn) return null;
  if (!settings.notificationSoundsEnabled) return null;
  if (audioReady) return null;

  if (!isAudioContextSupported()) {
    return (
      <div className="bg-amber-500/15 border border-amber-500/40 text-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <Volume2 className="w-5 h-5 mt-0.5 shrink-0" />
        <div className="flex-1 text-sm font-bold">
          Your browser does not support Web Audio. Notification chimes will not play here.
        </div>
      </div>
    );
  }

  const handleClick = async () => {
    if (pending) return;
    setPending(true);
    const ok = await unlockNotificationAudio();
    setAudioReady(ok);
    if (ok) {
      await playGeneralNotificationSound(settings.notificationSoundVolume ?? 0.7);
      toast({ title: 'Notification sounds enabled', description: 'You will hear chimes for new orders and messages.' });
    } else {
      toast({
        title: 'Browser blocked sound',
        description: 'Your browser blocked sound until you interact with the page. Click the banner once and try again.',
        variant: 'destructive',
      });
    }
    setPending(false);
  };

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={pending}
      className="w-full text-left bg-primary/10 hover:bg-primary/20 border border-primary/40 text-primary rounded-2xl p-4 flex items-start gap-3 transition-colors disabled:opacity-60"
    >
      <Volume2 className="w-5 h-5 mt-0.5 shrink-0" />
      <div className="flex-1">
        <div className="font-black uppercase tracking-wider text-sm">Click to enable notification sounds</div>
        <p className="text-sm font-bold mt-1 text-primary/80">
          Your browser blocks audio until you interact with the page. One click unlocks order, message, and general chimes for this admin session.
        </p>
      </div>
      <span className="text-xs font-black uppercase tracking-wider bg-primary text-primary-foreground px-3 py-1.5 rounded-lg shrink-0">
        {pending ? 'Enabling…' : 'Enable'}
      </span>
    </button>
  );
}
