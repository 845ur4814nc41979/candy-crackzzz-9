import type {
  AdminActivityEntry,
  AdminRole,
  AdminUser,
  InventoryItem,
  InventoryTransaction,
  MerchItem,
  OrderRequest,
  Product,
  ReferralCode,
  ReferralEvent,
  Review,
  RewardProfile,
  RewardTransaction,
  RewardsCampaign,
  Settings,
  StaffReferralCode,
  StaffReferralCredit,
} from '../types';

export type PublicAdminUser = Omit<AdminUser, 'passwordHash'>;

export interface AuthSnapshot {
  isAdminSetup: boolean;
  currentUser: PublicAdminUser | null;
  staffUsers: PublicAdminUser[];
  adminUsers: PublicAdminUser[];
  activityLogs: AdminActivityEntry[];
}

export interface BootstrapResponse {
  state: {
    products: Product[];
    orders: OrderRequest[];
    settings: Settings;
    reviews: Review[];
    rewardProfiles: RewardProfile[];
    merch: MerchItem[];
    campaigns: RewardsCampaign[];
    inventory: InventoryItem[];
    inventoryTransactions: InventoryTransaction[];
    staffReferralCodes: StaffReferralCode[];
    rewardTransactions: RewardTransaction[];
    referralCodes: ReferralCode[];
    referralEvents: ReferralEvent[];
    staffReferralCredits: StaffReferralCredit[];
  };
  auth: AuthSnapshot;
}

const API_PREFIX = '/api/cc';

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_PREFIX}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || 'Request failed.');
  }

  return payload as T;
}

export function apiGetBootstrap() {
  return apiRequest<BootstrapResponse>('/bootstrap', { method: 'GET' });
}

export function apiPersistState<K extends keyof BootstrapResponse['state']>(key: K, value: BootstrapResponse['state'][K]) {
  return apiRequest<{ ok: true }>(`/state/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}

export function apiSetupAdmin(username: string, password: string) {
  return apiRequest<{ auth: AuthSnapshot }>('/auth/setup', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function apiLogin(username: string, password: string) {
  return apiRequest<{ auth: AuthSnapshot }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function apiLogout() {
  return apiRequest<{ ok: true }>('/auth/logout', { method: 'POST', body: JSON.stringify({}) });
}

export function apiChangeCredentials(currentPassword: string, newUsername: string, newPassword: string) {
  return apiRequest<{ auth: AuthSnapshot }>('/auth/change-credentials', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newUsername, newPassword }),
  });
}

export function apiCreateEmployee(username: string, password: string) {
  return apiRequest<{ auth: AuthSnapshot; invite: { username: string; password: string } }>('/auth/create-employee', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function apiSetEmployeeAccess(userId: string, enabled: boolean) {
  return apiRequest<{ auth: AuthSnapshot }>('/auth/set-employee-access', {
    method: 'POST',
    body: JSON.stringify({ userId, enabled }),
  });
}

// ----- Admin Team CRUD -----

export interface AdminInvite {
  username: string;
  password: string;
  role: AdminRole;
}

export function apiCreateAdminUser(payload: {
  username: string;
  password: string;
  role: AdminRole;
  mustChangePassword?: boolean;
}) {
  return apiRequest<{ auth: AuthSnapshot; invite: AdminInvite }>('/auth/admin-users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function apiUpdateAdminUser(
  userId: string,
  payload: { role?: AdminRole; status?: 'active' | 'disabled'; mustChangePassword?: boolean; username?: string },
) {
  return apiRequest<{ auth: AuthSnapshot }>(`/auth/admin-users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function apiResetAdminUserPassword(
  userId: string,
  payload: { password: string; mustChangePassword?: boolean },
) {
  return apiRequest<{ auth: AuthSnapshot; invite: AdminInvite }>(
    `/auth/admin-users/${encodeURIComponent(userId)}/reset-password`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

export function apiDeleteAdminUser(userId: string) {
  return apiRequest<{ auth: AuthSnapshot }>(`/auth/admin-users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}

export function authHasRole(currentUser: PublicAdminUser | null, roles?: AdminRole[]) {
  if (!roles || roles.length === 0) return !!currentUser;
  if (!currentUser) return false;
  return roles.includes(currentUser.role);
}

// ----- Messages -----
export interface MessageRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  type: string;
  contactMethod: string;
  createdAt: string;
  readAt: string | null;
  archivedAt: string | null;
}

export function apiCreatePublicMessage(payload: {
  name: string;
  phone?: string;
  email?: string;
  subject?: string;
  message: string;
  type?: string;
  contactMethod?: string;
}) {
  return apiRequest<{ ok: true; id: string }>('/messages', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function apiListMessages(includeArchived = false) {
  return apiRequest<{ messages: MessageRecord[] }>(
    `/messages${includeArchived ? '?includeArchived=true' : ''}`,
    { method: 'GET' },
  );
}

export function apiSetMessageRead(id: string, read: boolean) {
  return apiRequest<{ message: MessageRecord }>(`/messages/${id}/read`, {
    method: 'POST',
    body: JSON.stringify({ read }),
  });
}

export function apiSetMessageArchived(id: string, archived: boolean) {
  return apiRequest<{ message: MessageRecord }>(`/messages/${id}/archive`, {
    method: 'POST',
    body: JSON.stringify({ archived }),
  });
}

export function apiDeleteMessage(id: string) {
  return apiRequest<{ ok: true }>(`/messages/${id}`, { method: 'DELETE' });
}

// ----- Notifications -----
export interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  body: string;
  relatedKind: string;
  relatedId: string;
  createdAt: string;
  readAt: string | null;
}

export function apiListNotifications() {
  return apiRequest<{ notifications: NotificationRecord[]; unread: number }>('/notifications', {
    method: 'GET',
  });
}

export function apiSetNotificationRead(id: string, read: boolean) {
  return apiRequest<{ notification: NotificationRecord }>(`/notifications/${id}/read`, {
    method: 'POST',
    body: JSON.stringify({ read }),
  });
}

export function apiMarkAllNotificationsRead() {
  return apiRequest<{ ok: true; updated: number }>('/notifications/read-all', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function apiDeleteNotification(id: string) {
  return apiRequest<{ ok: true }>(`/notifications/${id}`, { method: 'DELETE' });
}

// ----- Order notify -----
export function apiNotifyOrder(payload: {
  businessName?: string;
  toEmail?: string;
  toPhone?: string;
  order: Record<string, unknown>;
}) {
  return apiRequest<{ ok: boolean; accepted?: boolean; saved?: boolean; message?: string }>(
    '/orders/notify',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

// ----- Status -----
export interface ProviderStatusEntry {
  configured: boolean;
  missing: string[];
  [key: string]: unknown;
}
export interface OptionalProviderStatusEntry extends ProviderStatusEntry {
  purpose?: string;
}
export interface SystemStatus {
  database: { connected: boolean; kind: string };
  session: { sessionSecretConfigured: boolean; adminUsernameConfigured: boolean; adminPasswordConfigured: boolean };
  email: ProviderStatusEntry;
  sms: ProviderStatusEntry;
  providers?: {
    openai?: OptionalProviderStatusEntry;
    googleMaps?: OptionalProviderStatusEntry;
    push?: OptionalProviderStatusEntry;
  };
  businessName: string | null;
}

export function apiGetStatus() {
  return apiRequest<SystemStatus>('/status', { method: 'GET' });
}

export function apiTestEmail(to?: string) {
  return apiRequest<{ ok: boolean; result: { sent: boolean; reason?: string } }>(
    '/notifications/test-email',
    { method: 'POST', body: JSON.stringify({ to }) },
  );
}

export function apiTestSms(to?: string) {
  return apiRequest<{ ok: boolean; result: { sent: boolean; reason?: string } }>(
    '/notifications/test-sms',
    { method: 'POST', body: JSON.stringify({ to }) },
  );
}

// ----- Analytics -----
export interface AnalyticsViewRecord {
  id: string;
  path: string;
  title: string;
  referrer: string;
  visitorId: string;
  sessionId: string;
  deviceType: string;
  userAgent: string;
  createdAt: string;
}

export interface AnalyticsSummary {
  totalViews: number;
  uniqueVisitors: number;
  viewsToday: number;
  viewsThisWeek: number;
  viewsThisMonth: number;
  topPages: Array<{ path: string; views: number }>;
  recentViews: AnalyticsViewRecord[];
  deviceBreakdown: Array<{ device: string; views: number }>;
  referrerBreakdown: Array<{ referrer: string; views: number }>;
}

export function apiTrackPageView(payload: {
  path: string;
  title?: string;
  referrer?: string;
  visitorId?: string;
  sessionId?: string;
  deviceType?: string;
  retentionLimit?: number;
}) {
  return apiRequest<{ ok: boolean; skipped?: boolean }>('/analytics/view', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function apiGetAnalyticsSummary() {
  return apiRequest<AnalyticsSummary>('/analytics/summary', { method: 'GET' });
}

export function apiGetRecentAnalyticsViews(limit = 50) {
  return apiRequest<{ recentViews: AnalyticsViewRecord[] }>(`/analytics/recent?limit=${limit}`, {
    method: 'GET',
  });
}

// NOTE: Product/merch description generation is now 100% local (see
// src/lib/smartDescription.ts and src/components/admin/SmartDescriptionButton.tsx).
// The previous apiGenerateAI() helper that called /api/cc/ai/generate has
// been removed from the client to guarantee no OPENAI_API_KEY dependency.
// The backend route still exists in artifacts/api-server but is no longer
// reachable from the UI.

// -------- Directions --------

export interface DirectionsApiPayload {
  origin?: string;
  originAddress?: string;
  destination: string;
  mode?: string;
}

export interface DirectionsApiResponse {
  ok: boolean;
  distanceText?: string;
  distanceMeters?: number;
  durationText?: string;
  durationSeconds?: number;
  originUsed?: 'current_location' | 'business_address';
  mapsUrl?: string;
  provider?: string;
  message?: string;
}

export function apiDirections(payload: DirectionsApiPayload) {
  return apiRequest<DirectionsApiResponse>('/directions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// -------- AI Tools --------

export interface AiProductDescriptionPayload {
  productName: string;
  category?: string;
  flavors?: string[];
  notes?: string;
  tone?: string;
}

export interface AiProductDescriptionResponse {
  ok: boolean;
  description?: string;
  suggestedNames?: string[];
  message?: string;
}

export interface AiPromoMessagePayload {
  campaignType?: string;
  audience?: string;
  offer: string;
  channel?: string;
}

export interface AiReferralMessagePayload {
  type?: string;
  context?: string;
}

export interface AiMessageResponse {
  ok: boolean;
  message?: string;
}

export function apiAiProductDescription(payload: AiProductDescriptionPayload) {
  return apiRequest<AiProductDescriptionResponse>('/ai/product-description', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function apiAiPromoMessage(payload: AiPromoMessagePayload) {
  return apiRequest<AiMessageResponse>('/ai/promo-message', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function apiAiReferralMessage(payload: AiReferralMessagePayload) {
  return apiRequest<AiMessageResponse>('/ai/referral-message', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// -------- Inventory (helpers only — CRUD via apiPersistState) --------

export { type InventoryItem, type InventoryTransaction } from '../types';
