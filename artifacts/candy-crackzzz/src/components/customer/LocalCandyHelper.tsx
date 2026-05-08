import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppContext } from '@/context/AppContext';
import { buildHelperResponse, type HelperRecommendation } from '@/lib/localHelper';

type Message = {
  role: 'bot' | 'user';
  text: string;
  recommendations?: HelperRecommendation[];
  disclaimer?: string;
};

export default function LocalCandyHelper() {
  const { products, merch, settings } = useAppContext();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const path = (location || '/').toLowerCase();
  const isAdminRoute = path.startsWith('/admin');
  const helperEnabled = settings.helperEnabled ?? true;

  const allowedOnPath = useMemo(() => {
    if (isAdminRoute) return false;
    if (path === '/' || path === '') return settings.helperShowOnHome ?? true;
    if (path.startsWith('/menu')) return settings.helperShowOnMenu ?? true;
    if (path.startsWith('/merch')) return settings.helperShowOnMerch ?? true;
    if (path.startsWith('/cart')) return settings.helperShowOnCart ?? true;
    return true;
  }, [path, isAdminRoute, settings.helperShowOnHome, settings.helperShowOnMenu, settings.helperShowOnMerch, settings.helperShowOnCart]);

  const showFloatingButton = !!helperEnabled && (settings.helperShowFloating ?? true) && allowedOnPath;
  const canOpenViaEvent = !!helperEnabled && !isAdminRoute;

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'bot', text: settings.helperGreeting ?? 'Need help picking something sweet?' }]);
    }
  }, [open, messages.length, settings.helperGreeting]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, open]);

  useEffect(() => {
    if (!canOpenViaEvent) return;
    const handler = () => setOpen(true);
    window.addEventListener('cc-open-helper', handler);
    return () => window.removeEventListener('cc-open-helper', handler);
  }, [canOpenViaEvent]);

  if (!showFloatingButton && !open) return null;

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const result = buildHelperResponse(text, products, merch, settings);
    setMessages(prev => [
      ...prev,
      { role: 'user', text },
      { role: 'bot', text: result.reply, recommendations: result.recommendations, disclaimer: result.disclaimer },
    ]);
    setInput('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[60] max-w-[calc(100vw-1.5rem)]">
      {open ? (
        <div
          data-testid="local-candy-helper-panel"
          className="w-[22rem] max-w-full rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-gradient-to-r from-primary/15 to-secondary/15">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <strong className="text-sm font-black uppercase tracking-wider">Candy Helper</strong>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close helper">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div ref={scrollRef} className="max-h-80 min-h-[14rem] overflow-y-auto p-4 space-y-3 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'bot' ? 'flex flex-col gap-2 items-start' : 'flex flex-col gap-2 items-end'}>
                <div className={
                  m.role === 'bot'
                    ? 'rounded-2xl bg-muted/40 px-3 py-2 text-foreground max-w-[85%]'
                    : 'rounded-2xl bg-primary/20 text-primary-foreground/90 px-3 py-2 font-medium max-w-[85%]'
                }>
                  {m.text}
                </div>

                {m.role === 'bot' && m.recommendations && m.recommendations.length > 0 && (
                  <div className="flex flex-col gap-1 w-full">
                    {m.recommendations.map(r => (
                      <Link
                        key={`${r.kind}-${r.id}`}
                        href={r.kind === 'product' ? (r.slug ? `/menu/${r.slug}` : '/menu') : '/merch'}
                        onClick={() => setOpen(false)}
                        className="text-xs font-bold rounded-lg border border-border bg-background px-3 py-2 hover-elevate active-elevate-2"
                        data-testid={`helper-rec-${r.kind}-${r.id}`}
                      >
                        {r.kind === 'product' ? '🍬 ' : '👕 '} {r.name}
                      </Link>
                    ))}
                  </div>
                )}

                {m.role === 'bot' && m.disclaimer && (
                  <p className="text-[11px] text-muted-foreground italic max-w-[90%]">
                    {m.disclaimer}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-border p-3 bg-background">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="e.g. sour blue raspberry, party tray, sparkly tumbler"
              className="bg-card text-sm"
              data-testid="helper-input"
            />
            <Button onClick={send} size="icon" aria-label="Send" data-testid="helper-send">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : showFloatingButton ? (
        <Button
          onClick={() => setOpen(true)}
          className="rounded-full font-black uppercase tracking-wider shadow-[0_0_20px_rgba(255,0,255,0.45)] h-12 px-5"
          data-testid="open-local-candy-helper"
        >
          <MessageCircle className="mr-2 h-4 w-4" /> Helper
        </Button>
      ) : null}
    </div>
  );
}
