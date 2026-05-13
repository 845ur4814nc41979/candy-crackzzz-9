import { Router, type Request, type Response } from "express";
import crypto from "node:crypto";
import {
  type AdminActivityEntry,
  type AdminPermission,
  type AdminRole,
  type AdminUser,
  type PersistedDb,
  type StateKey,
  ADMIN_ROLES,
  STATE_KEYS,
  OWNER_ONLY_STATE_KEYS,
  defaultSettings,
  createId,
  hashPassword,
  verifyPassword,
  normalizeUsername,
  readDb,
  writeDb,
  isUsingDatabase,
  userHasServerPermission,
  normalizeAdminRole,
  listMessages,
  createMessage,
  markMessageRead,
  archiveMessage,
  deleteMessage,
  listNotifications,
  createNotification,
  recordAnalyticsView,
  getAnalyticsSummary,
  listRecentAnalyticsViews,
  shouldRecordView,
  pruneAnalytics,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "./candy-storage";
import {
  buildOrderMessage,
  normalizePhone as normalizePhoneNumber,
  sendResendEmail,
  sendTwilioSms,
  emailProviderStatus,
  smsProviderStatus,
  resolveSmsDestination,
} from "./candy-notify";

const AUTH_COOKIE = "cc_admin_session";

function sanitizeUser(user: AdminUser | null) {
  if (!user) return null;
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}
function sanitizeUsers(users: AdminUser[]) {
  return users.map((u) => sanitizeUser(u)).filter(Boolean);
}
function parseCookies(req: Request): Record<string, string> {
  const raw = req.headers.cookie;
  if (!raw) return {};
  return raw.split(";").reduce<Record<string, string>>((acc, part) => {
    const [name, ...rest] = part.trim().split("=");
    if (!name) return acc;
    acc[name] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}
function setSessionCookie(res: Response, token: string) {
  const isProd = process.env.NODE_ENV === "production";
  const secure = isProd ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${AUTH_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${60 * 60 * 24 * 7}`,
  );
}
function clearSessionCookie(res: Response) {
  res.setHeader("Set-Cookie", `${AUTH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}
function getSessionToken(req: Request): string | null {
  return parseCookies(req)[AUTH_COOKIE] ?? null;
}
function getCurrentUser(db: PersistedDb, req: Request): AdminUser | null {
  const token = getSessionToken(req);
  if (!token) return null;
  const session = db.auth.sessions[token];
  if (!session) return null;
  const user = db.auth.users.find((u) => u.id === session.userId && u.status === "active") ?? null;
  if (!user) delete db.auth.sessions[token];
  return user;
}
function requireOwner(db: PersistedDb, req: Request): AdminUser | null {
  const user = getCurrentUser(db, req);
  if (!user || user.role !== "owner") return null;
  return user;
}
function requirePermission(db: PersistedDb, req: Request, permission: AdminPermission): AdminUser | null {
  const user = getCurrentUser(db, req);
  if (!user) return null;
  if (!userHasServerPermission(user, permission)) return null;
  return user;
}
function isStaffRole(role: AdminRole): boolean {
  const norm = normalizeAdminRole(role);
  return norm === "staff";
}
function countActiveOwners(db: PersistedDb, excludeUserId?: string): number {
  return db.auth.users.filter(
    (u) => u.role === "owner" && u.status === "active" && u.id !== excludeUserId,
  ).length;
}
function buildAuthSnapshot(db: PersistedDb, req: Request) {
  const currentUser = getCurrentUser(db, req);
  return {
    isAdminSetup: db.auth.users.length > 0,
    currentUser: sanitizeUser(currentUser),
    staffUsers: sanitizeUsers(db.auth.users.filter((u) => isStaffRole(u.role))),
    adminUsers: userHasServerPermission(currentUser, "manageAdmins")
      ? sanitizeUsers(db.auth.users)
      : [],
    activityLogs: db.auth.activityLogs,
  };
}
function startSession(db: PersistedDb, user: AdminUser) {
  const loginAt = new Date().toISOString();
  const activityId = createId("act");
  const token = crypto.randomBytes(32).toString("hex");
  db.auth.activityLogs = [
    { id: activityId, userId: user.id, username: user.username, role: user.role, loginAt, status: "active" },
    ...db.auth.activityLogs,
  ];
  db.auth.sessions[token] = { userId: user.id, activityId, startedAt: loginAt };
  db.auth.users = db.auth.users.map((u) => (u.id === user.id ? { ...u, lastLoginAt: loginAt } : u));
  return token;
}
function finalizeActivityEntry(
  logs: AdminActivityEntry[],
  activityId: string | undefined,
  status: "logged_out" | "forced_logout",
) {
  if (!activityId) return logs;
  const endedAt = new Date().toISOString();
  return logs.map((entry) => {
    if (entry.id !== activityId || entry.logoutAt) return entry;
    const durationMs = Math.max(0, new Date(endedAt).getTime() - new Date(entry.loginAt).getTime());
    return { ...entry, logoutAt: endedAt, durationMs, status };
  });
}
function endSession(db: PersistedDb, req: Request, status: "logged_out" | "forced_logout") {
  const token = getSessionToken(req);
  if (!token) return;
  const session = db.auth.sessions[token];
  if (!session) return;
  db.auth.activityLogs = finalizeActivityEntry(db.auth.activityLogs, session.activityId, status);
  delete db.auth.sessions[token];
}
function forceLogoutUserSessions(db: PersistedDb, userId: string) {
  for (const [token, session] of Object.entries(db.auth.sessions)) {
    if (session.userId !== userId) continue;
    db.auth.activityLogs = finalizeActivityEntry(db.auth.activityLogs, session.activityId, "forced_logout");
    delete db.auth.sessions[token];
  }
}

async function ensureAdmin(req: Request, res: Response): Promise<AdminUser | null> {
  const db = await readDb();
  const user = getCurrentUser(db, req);
  if (!user) {
    res.status(401).json({ message: "Admin authentication is required." });
    return null;
  }
  return user;
}

const router = Router();

router.get("/cc/bootstrap", async (req, res) => {
  try {
    const db = await readDb();
    await writeDb(db);
    res.json({ state: db.state, auth: buildAuthSnapshot(db, req) });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Bootstrap failed." });
  }
});

router.put("/cc/state/:key", async (req, res) => {
  try {
    const key = req.params.key as StateKey;
    if (!STATE_KEYS.includes(key)) {
      res.status(404).json({ message: "Unknown state key." });
      return;
    }
    const db = await readDb();
    if (OWNER_ONLY_STATE_KEYS.has(key) && !requireOwner(db, req)) {
      res.status(401).json({ message: "Owner access is required." });
      return;
    }
    const body = (req.body ?? {}) as { value?: unknown };
    if (typeof body.value === "undefined") {
      res.status(400).json({ message: "Missing state value." });
      return;
    }
    if (key === "settings") {
      db.state.settings = { ...defaultSettings, ...((body.value as Record<string, unknown>) ?? {}) };
    } else {
      (db.state[key] as unknown) = body.value;
    }
    await writeDb(db);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "State update failed." });
  }
});

router.post("/cc/orders/notify", async (req, res) => {
  try {
    const body = (req.body ?? {}) as { businessName?: string; toEmail?: string; toPhone?: string; order?: { id?: string; customerName?: string; phone?: string; email?: string; requestedDate?: string; requestedTime?: string; pickupOrDelivery?: "pickup" | "delivery"; deliveryAddress?: string; notes?: string; specialInstructions?: string; eventType?: string; paymentMethod?: string; total?: number; items?: Array<{ name?: string; quantity?: number; price?: number | null }>; } };
    const order = body.order;
    if (!order || !order.customerName || !Array.isArray(order.items) || order.items.length === 0) {
      res.status(400).json({ ok: false, message: "Order details are missing or invalid." });
      return;
    }

    const businessName = (body.businessName ?? "").trim() || process.env["BUSINESS_NAME"] || "Candy Crackzzz";
    const text = buildOrderMessage(order, businessName);
    const subject = `New order request - ${order.customerName}`;
    const destinationEmail = (process.env["ORDER_NOTIFICATION_EMAIL"] ?? "").trim() || (body.toEmail ?? "").trim();
    const smsTarget = resolveSmsDestination(body.toPhone);

    await createNotification({
      type: "order",
      title: `New order from ${order.customerName}`,
      body: `${order.items.length} item${order.items.length === 1 ? "" : "s"} • $${(order.total ?? 0).toFixed(2)}`,
      relatedKind: "order",
      relatedId: order.id ?? "",
    });

    const [emailResult, smsResult] = await Promise.all([
      sendResendEmail(destinationEmail, subject, text),
      sendTwilioSms(smsTarget.destination, text),
    ]);

    const response = {
      ok: true,
      accepted: true,
      saved: true,
      email: emailResult,
      sms: {
        ...smsResult,
        destinationSource: smsTarget.destinationSource,
        destination: smsTarget.destination ? `${smsTarget.destination.slice(0, 3)}***` : '',
      },
      message: smsTarget.destinationSource === 'none' ? 'Order notification handled. SMS skipped: no destination.' : 'Order notification handled.',
    };

    console.log('[cc/orders/notify]', {
      smsAttempted: smsResult.attempted,
      smsSent: smsResult.sent,
      smsSkipped: smsResult.skipped,
      smsDestinationSource: smsTarget.destinationSource,
      smsDestinationPresent: !!smsTarget.destination,
    });

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ ok: false, message: error instanceof Error ? error.message : "Failed." });
  }
});

export default router;
