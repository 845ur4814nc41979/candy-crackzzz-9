import type { AdminRole } from '@/types';

export type DemoTourId =
  | 'admin'
  | 'rewards'
  | 'checkout'
  | 'delivery'
  | 'customer';

export interface DemoStateForUser {
  hasSeenAdminTour: boolean;
  hasSeenRewardsTour: boolean;
  hasSeenCheckoutTour: boolean;
  hasSeenDeliveryTour: boolean;
  dismissedDemoPrompt: boolean;
  lastDemoCompletedAt?: string;
  demoModeEnabled: boolean;
}

const STORAGE_PREFIX = 'cc.demoMode.v1.';

function emptyState(): DemoStateForUser {
  return {
    hasSeenAdminTour: false,
    hasSeenRewardsTour: false,
    hasSeenCheckoutTour: false,
    hasSeenDeliveryTour: false,
    dismissedDemoPrompt: false,
    demoModeEnabled: false,
  };
}

function safeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function keyFor(scope: string) {
  return `${STORAGE_PREFIX}${scope}`;
}

export function loadDemoState(scope: string): DemoStateForUser {
  const storage = safeStorage();
  if (!storage) return emptyState();
  try {
    const raw = storage.getItem(keyFor(scope));
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<DemoStateForUser>;
    return { ...emptyState(), ...parsed };
  } catch {
    return emptyState();
  }
}

export function saveDemoState(scope: string, state: DemoStateForUser): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(keyFor(scope), JSON.stringify(state));
  } catch {
    /* storage full or blocked — silently ignore */
  }
}

export function markTourSeen(scope: string, tour: DemoTourId): DemoStateForUser {
  const next = { ...loadDemoState(scope) };
  if (tour === 'admin') next.hasSeenAdminTour = true;
  if (tour === 'rewards') next.hasSeenRewardsTour = true;
  if (tour === 'checkout') next.hasSeenCheckoutTour = true;
  if (tour === 'delivery') next.hasSeenDeliveryTour = true;
  next.lastDemoCompletedAt = new Date().toISOString();
  saveDemoState(scope, next);
  return next;
}

export function dismissPrompt(scope: string, permanent = false): DemoStateForUser {
  const next = { ...loadDemoState(scope), dismissedDemoPrompt: true };
  if (permanent) next.demoModeEnabled = false;
  saveDemoState(scope, next);
  return next;
}

export function resetTour(scope: string, tour: DemoTourId): DemoStateForUser {
  const next = { ...loadDemoState(scope) };
  if (tour === 'admin') next.hasSeenAdminTour = false;
  if (tour === 'rewards') next.hasSeenRewardsTour = false;
  if (tour === 'checkout') next.hasSeenCheckoutTour = false;
  if (tour === 'delivery') next.hasSeenDeliveryTour = false;
  saveDemoState(scope, next);
  return next;
}

/** Pick the right admin tour for a role. Returns null for customer / unknown. */
export function adminTourForRole(role: AdminRole | undefined | null): DemoTourId | null {
  if (!role) return null;
  switch (role) {
    case 'owner':
    case 'site_admin':
    case 'system_admin':
    case 'campaign_admin':
    case 'staff':
    case 'viewer':
      return 'admin';
    case 'delivery_driver':
      return 'delivery';
    default:
      return 'admin';
  }
}
