import { apiTrackPageView } from './api';

const VISITOR_KEY = 'cc_visitor_id';
const SESSION_KEY = 'cc_session_id';

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `v-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

export function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = window.localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = uuid();
      window.localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = uuid();
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

export function detectDeviceType(): DeviceType {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent || '';
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) {
    if (/iPad/i.test(ua)) return 'tablet';
    return 'mobile';
  }
  return 'desktop';
}

const recentLocal = new Map<string, number>();
const LOCAL_DEDUPE_MS = 10_000;

function shouldTrackLocally(path: string): boolean {
  const now = Date.now();
  const last = recentLocal.get(path);
  if (last && now - last < LOCAL_DEDUPE_MS) return false;
  recentLocal.set(path, now);
  return true;
}

export interface TrackPageViewOptions {
  path: string;
  title?: string;
  excludeAdminRoutes?: boolean;
  retentionLimit?: number;
}

export async function trackPageView(opts: TrackPageViewOptions): Promise<boolean> {
  const path = opts.path || '/';
  if (!path.startsWith('/')) return false;
  const excludeAdmin = opts.excludeAdminRoutes ?? true;
  if (excludeAdmin && (path.startsWith('/admin') || path.startsWith('/api'))) return false;
  if (!shouldTrackLocally(path)) return false;
  try {
    await apiTrackPageView({
      path,
      title: opts.title ?? (typeof document !== 'undefined' ? document.title : ''),
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      deviceType: detectDeviceType(),
      retentionLimit: opts.retentionLimit,
    });
    return true;
  } catch {
    return false;
  }
}
