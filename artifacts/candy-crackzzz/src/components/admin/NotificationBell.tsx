import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { Bell, Check, Trash2, ShoppingCart, Mail, Sparkles, Volume2, VolumeX } from 'lucide-react';
import {
  apiListNotifications,
  apiSetNotificationRead,
  apiMarkAllNotificationsRead,
  apiDeleteNotification,
  type NotificationRecord,
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useAppContext } from '@/context/AppContext';
import {
  playOrderNotificationSound,
  playMessageNotificationSound,
  playGeneralNotificationSound,
  unlockNotificationAudio,
  canPlayNotificationAudio,
  subscribeNotificationAudio,
} from '@/lib/notificationSounds';

function debug(...args: unknown[]) {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage?.getItem('cc_audio_debug') === '1') {
      // eslint-disable-next-line no-console
      console.log('[NotificationBell]', ...args);
    }
  } catch {
    // ignore
  }
}

function typeMeta(type: string) {
  if (type === 'order') {
    return { label: 'Order', Icon: ShoppingCart, className: 'bg-primary/15 text-primary' };
  }
  if (type === 'message') {
    return { label: 'Message', Icon: Mail, className: 'bg-secondary/15 text-secondary' };
  }
  return { label: 'General', Icon: Sparkles, className: 'bg-accent/20 text-accent' };
}

export default function NotificationBell() {
  const { isLoggedIn } = useAuth();
  const { settings } = useAppContext();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unread, setUnread] = useState(0);
  const [audioReady, setAudioReady] = useState<boolean>(canPlayNotificationAudio());
  const [missedDueToLock, setMissedDueToLock] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const isInitialLoad = useRef(true);

  const enabled = settings.notificationBellEnabled !== false;

  const playFor = async (n: NotificationRecord) => {
    debug('notification received', { id: n.id, type: n.type });
    if (!settings.notificationSoundsEnabled) {
      debug('sounds disabled in settings, skipping');
      return;
    }
    const vol = settings.notificationSoundVolume ?? 0.7;
    let played = false;
    if (n.type === 'order') {
      if (settings.orderSoundEnabled !== false) {
        debug('selected sound: order');
        played = await playOrderNotificationSound(vol);
      }
    } else if (n.type === 'message') {
      if (settings.messageSoundEnabled !== false) {
        debug('selected sound: message');
        played = await playMessageNotificationSound(vol);
      }
    } else {
      if (settings.generalSoundEnabled !== false) {
        debug('selected sound: general');
        played = await playGeneralNotificationSound(vol);
      }
    }
    debug('played?', played, 'audioReady?', canPlayNotificationAudio());
    if (!played) {
      setMissedDueToLock(true);
    }
  };

  const load = async () => {
    try {
      const result = await apiListNotifications();
      const incoming = result.notifications;
      if (isInitialLoad.current) {
        for (const n of incoming) seenIds.current.add(n.id);
        isInitialLoad.current = false;
      } else {
        const newOnes = incoming.filter((n) => !seenIds.current.has(n.id));
        for (const n of newOnes) seenIds.current.add(n.id);
        const newestUnread = newOnes
          .filter((n) => !n.readAt)
          .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
        if (newestUnread) void playFor(newestUnread);
      }
      setNotifications(incoming);
      setUnread(result.unread);
    } catch {
      // ignore (user might be logged out)
    }
  };

  // poll
  useEffect(() => {
    if (!enabled || !isLoggedIn) return;
    isInitialLoad.current = true;
    seenIds.current = new Set();
    void load();
    if (settings.notificationPollingEnabled === false) return;
    const intervalSec = Math.max(5, Math.min(120, settings.notificationPollingSeconds || 12));
    let timer: number | undefined;
    const start = () => {
      const ms = (typeof document !== 'undefined' && document.hidden ? intervalSec * 4 : intervalSec) * 1000;
      timer = window.setInterval(load, ms);
    };
    start();
    const onVisibility = () => {
      if (timer) window.clearInterval(timer);
      start();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (timer) window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isLoggedIn, settings.notificationPollingEnabled, settings.notificationPollingSeconds]);

  // subscribe to global audio readiness changes
  useEffect(() => {
    const refresh = () => {
      const ready = canPlayNotificationAudio();
      setAudioReady(ready);
      if (ready) setMissedDueToLock(false);
    };
    refresh();
    const unsub = subscribeNotificationAudio(refresh);
    return () => unsub();
  }, [settings.notificationSoundsEnabled]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggleRead = async (n: NotificationRecord) => {
    try {
      const result = await apiSetNotificationRead(n.id, !n.readAt);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? result.notification : x)));
      setUnread((u) => Math.max(0, u + (n.readAt ? 1 : -1)));
    } catch {
      // ignore
    }
  };

  const remove = async (n: NotificationRecord) => {
    try {
      await apiDeleteNotification(n.id);
      setNotifications((prev) => prev.filter((x) => x.id !== n.id));
      if (!n.readAt) setUnread((u) => Math.max(0, u - 1));
    } catch {
      // ignore
    }
  };

  const markAll = async () => {
    try {
      await apiMarkAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
      setUnread(0);
    } catch {
      // ignore
    }
  };

  const linkFor = (n: NotificationRecord): string | null => {
    if (n.relatedKind === 'message' || n.type === 'message') return '/admin/messages';
    if (n.relatedKind === 'order' || n.type === 'order') return '/admin/orders';
    return null;
  };

  const handleEnableSound = async () => {
    const ok = await unlockNotificationAudio();
    setAudioReady(ok);
    if (ok) {
      setMissedDueToLock(false);
      if (settings.notificationSoundsEnabled) {
        await playGeneralNotificationSound(settings.notificationSoundVolume ?? 0.7);
      }
    }
  };

  const showSoundUnlock = useMemo(
    () => settings.notificationSoundsEnabled && !audioReady,
    [settings.notificationSoundsEnabled, audioReady],
  );

  if (!enabled || !isLoggedIn) return null;

  const pulse = unread > 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className={`relative w-10 h-10 rounded-full bg-card border flex items-center justify-center transition-colors ${
          pulse
            ? 'border-primary/60 text-primary shadow-[0_0_18px_rgba(255,0,255,0.55)] animate-pulse'
            : 'border-border hover:bg-muted/50'
        }`}
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-black rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border-2 border-background">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[340px] sm:w-[380px] bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="font-black uppercase tracking-wider text-sm">Notifications</div>
            <div className="flex items-center gap-2">
              {audioReady ? (
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1">
                  <Volume2 className="w-3 h-3" /> On
                </span>
              ) : settings.notificationSoundsEnabled ? (
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <VolumeX className="w-3 h-3" /> Locked
                </span>
              ) : null}
              {unread > 0 && (
                <button
                  onClick={markAll}
                  className="text-xs font-bold text-primary uppercase tracking-wider hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {showSoundUnlock && (
            <button
              onClick={() => void handleEnableSound()}
              className="w-full px-4 py-3 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-black uppercase tracking-wider border-b border-border flex items-center justify-center gap-2"
            >
              <Volume2 className="w-3.5 h-3.5" /> Click to enable notification sounds
            </button>
          )}

          {missedDueToLock && (
            <div className="px-4 py-3 bg-amber-500/15 text-amber-200 text-xs font-bold border-b border-border flex items-center gap-2">
              <VolumeX className="w-3.5 h-3.5 shrink-0" />
              <span>Notification received. Click <span className="font-black">Enable Sounds</span> above to hear future alerts.</span>
            </div>
          )}

          <div className="max-h-[60vh] overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground font-bold text-sm">
                You're all caught up.
              </div>
            ) : (
              notifications.map((n) => {
                const href = linkFor(n);
                const meta = typeMeta(n.type);
                const body = (
                  <div
                    className={`p-3 group ${n.readAt ? 'opacity-70' : 'bg-primary/5'} hover:bg-muted/30 transition-colors`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${meta.className}`}>
                        <meta.Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] uppercase tracking-wider font-black px-1.5 py-0.5 rounded ${meta.className}`}>
                            {meta.label}
                          </span>
                          {!n.readAt && <span className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <div className={`text-sm truncate ${n.readAt ? 'font-bold' : 'font-black'}`}>
                          {n.title}
                        </div>
                        {n.body && (
                          <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5 font-bold">
                            {n.body}
                          </div>
                        )}
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mt-1 font-bold">
                          {new Date(n.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleRead(n);
                          }}
                          className="p-1 hover:bg-background rounded"
                          title={n.readAt ? 'Mark as unread' : 'Mark as read'}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            remove(n);
                          }}
                          className="p-1 hover:bg-background rounded text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
                return href ? (
                  <Link
                    key={n.id}
                    href={href}
                    onClick={() => {
                      setOpen(false);
                      if (!n.readAt) toggleRead(n);
                    }}
                    className="block"
                  >
                    {body}
                  </Link>
                ) : (
                  <div key={n.id}>{body}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
