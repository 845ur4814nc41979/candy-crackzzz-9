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
    // Legacy field: kept for backward compat with the older AdminAccount page.
    staffUsers: sanitizeUsers(db.auth.users.filter((u) => isStaffRole(u.role))),
    // Full team list (everyone). Owner-gated visibility is enforced where it's used.
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

// -------- BOOTSTRAP & STATE --------
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

// -------- AUTH --------
router.post("/cc/auth/setup", (_req, res) => {
  res.status(403).json({
    message:
      "Public admin setup is disabled. Sign in with the seeded owner account and change the credentials from Account and Security.",
  });
});

router.post("/cc/auth/login", async (req, res) => {
  try {
    const body = (req.body ?? {}) as { username?: string; password?: string };
    const username = normalizeUsername(body.username ?? "");
    const password = body.password ?? "";
    const db = await readDb();
    const matched = db.auth.users.find((u) => u.username === username);
    if (!matched || !verifyPassword(password, matched.passwordHash)) {
      res.status(401).json({ message: "Invalid username or password." });
      return;
    }
    if (matched.status !== "active") {
      res.status(403).json({ message: "This staff login has been disconnected. Contact the owner." });
      return;
    }
    if (matched.passwordHash !== hashPassword(password)) {
      // Migrate legacy hash to the SESSION_SECRET-keyed HMAC
      matched.passwordHash = hashPassword(password);
      db.auth.users = db.auth.users.map((u) => (u.id === matched.id ? matched : u));
    }
    const token = startSession(db, matched);
    await writeDb(db);
    setSessionCookie(res, token);
    res.json({ auth: buildAuthSnapshot(db, req) });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Login failed." });
  }
});

router.post("/cc/auth/logout", async (req, res) => {
  try {
    const db = await readDb();
    endSession(db, req, "logged_out");
    await writeDb(db);
    clearSessionCookie(res);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Logout failed." });
  }
});

router.post("/cc/auth/change-credentials", async (req, res) => {
  try {
    const db = await readDb();
    const currentUser = getCurrentUser(db, req);
    if (!currentUser) {
      res.status(401).json({ message: "You must be signed in to update credentials." });
      return;
    }
    const body = (req.body ?? {}) as {
      currentPassword?: string;
      newUsername?: string;
      newPassword?: string;
    };
    if (!verifyPassword(body.currentPassword ?? "", currentUser.passwordHash)) {
      res.status(400).json({ message: "Current password is incorrect." });
      return;
    }
    const nextUsername = (body.newUsername ?? "").trim()
      ? normalizeUsername(body.newUsername ?? "")
      : currentUser.username;
    if (nextUsername.length < 3) {
      res.status(400).json({ message: "New username must be at least 3 characters." });
      return;
    }
    const dup = db.auth.users.find((u) => u.username === nextUsername && u.id !== currentUser.id);
    if (dup) {
      res.status(400).json({ message: "That username is already in use." });
      return;
    }
    if ((body.newPassword ?? "").trim() && (body.newPassword ?? "").length < 8) {
      res.status(400).json({ message: "New password must be at least 8 characters." });
      return;
    }
    const passwordChanged = (body.newPassword ?? "").trim().length > 0;
    db.auth.users = db.auth.users.map((u) =>
      u.id === currentUser.id
        ? {
            ...u,
            username: nextUsername,
            passwordHash: passwordChanged ? hashPassword(body.newPassword ?? "") : u.passwordHash,
            mustChangePassword: passwordChanged ? false : u.mustChangePassword,
          }
        : u,
    );
    db.auth.activityLogs = db.auth.activityLogs.map((e) =>
      e.userId === currentUser.id ? { ...e, username: nextUsername } : e,
    );
    await writeDb(db);
    res.json({ auth: buildAuthSnapshot(db, req) });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Update failed." });
  }
});

router.post("/cc/auth/create-employee", async (req, res) => {
  try {
    const db = await readDb();
    const owner = requireOwner(db, req);
    if (!owner) {
      res.status(401).json({ message: "Only the owner can invite employees." });
      return;
    }
    const body = (req.body ?? {}) as { username?: string; password?: string };
    const username = normalizeUsername(body.username ?? "");
    const password = body.password ?? "";
    if (username.length < 3) {
      res.status(400).json({ message: "Employee username must be at least 3 characters." });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ message: "Temporary password must be at least 6 characters." });
      return;
    }
    if (db.auth.users.some((u) => u.username === username)) {
      res.status(400).json({ message: "That username is already in use." });
      return;
    }
    const employee: AdminUser = {
      id: createId("usr"),
      username,
      passwordHash: hashPassword(password),
      role: "employee",
      status: "active",
      createdAt: new Date().toISOString(),
    };
    db.auth.users = [...db.auth.users, employee];
    await writeDb(db);
    res.json({ auth: buildAuthSnapshot(db, req), invite: { username: employee.username, password } });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Create employee failed." });
  }
});

router.post("/cc/auth/set-employee-access", async (req, res) => {
  try {
    const db = await readDb();
    const owner = requireOwner(db, req);
    if (!owner) {
      res.status(401).json({ message: "Only the owner can manage employee access." });
      return;
    }
    const body = (req.body ?? {}) as { userId?: string; enabled?: boolean };
    const target = db.auth.users.find(
      (u) => u.id === body.userId && (u.role === "employee" || normalizeAdminRole(u.role) === "staff"),
    );
    if (!target) {
      res.status(404).json({ message: "Employee account not found." });
      return;
    }
    db.auth.users = db.auth.users.map((u) =>
      u.id === target.id ? { ...u, status: body.enabled ? "active" : "disabled" } : u,
    );
    if (!body.enabled) forceLogoutUserSessions(db, target.id);
    await writeDb(db);
    res.json({ auth: buildAuthSnapshot(db, req) });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Update failed." });
  }
});

// -------- ADMIN TEAM (Owner-only CRUD over all admin users) --------

function isAssignableRole(role: unknown): role is AdminRole {
  return typeof role === "string" && (ADMIN_ROLES as string[]).includes(role);
}

router.post("/cc/auth/admin-users", async (req, res) => {
  try {
    const db = await readDb();
    const actor = requirePermission(db, req, "manageAdmins");
    if (!actor) {
      res.status(403).json({ message: "Only admins with team management can create users." });
      return;
    }
    const body = (req.body ?? {}) as {
      username?: string;
      password?: string;
      role?: string;
      mustChangePassword?: boolean;
    };
    const username = normalizeUsername(body.username ?? "");
    const password = body.password ?? "";
    const role = body.role ?? "staff";

    if (username.length < 3) {
      res.status(400).json({ message: "Username must be at least 3 characters." });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ message: "Temporary password must be at least 8 characters." });
      return;
    }
    if (!isAssignableRole(role) || role === "employee") {
      res.status(400).json({ message: "Pick a valid role." });
      return;
    }
    if (db.auth.users.some((u) => u.username === username)) {
      res.status(400).json({ message: "That username is already in use." });
      return;
    }

    const newUser: AdminUser = {
      id: createId("usr"),
      username,
      passwordHash: hashPassword(password),
      role,
      status: "active",
      createdAt: new Date().toISOString(),
      mustChangePassword: body.mustChangePassword !== false,
    };
    db.auth.users = [...db.auth.users, newUser];
    await writeDb(db);
    res.json({
      auth: buildAuthSnapshot(db, req),
      invite: { username: newUser.username, password, role: newUser.role },
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Create failed." });
  }
});

router.patch("/cc/auth/admin-users/:id", async (req, res) => {
  try {
    const db = await readDb();
    const actor = requirePermission(db, req, "manageAdmins");
    if (!actor) {
      res.status(403).json({ message: "Only admins with team management can update users." });
      return;
    }
    const target = db.auth.users.find((u) => u.id === req.params.id);
    if (!target) {
      res.status(404).json({ message: "User not found." });
      return;
    }
    const body = (req.body ?? {}) as {
      role?: string;
      status?: "active" | "disabled";
      mustChangePassword?: boolean;
      username?: string;
    };

    let nextRole: AdminRole = target.role;
    if (typeof body.role === "string") {
      if (!isAssignableRole(body.role) || body.role === "employee") {
        res.status(400).json({ message: "Pick a valid role." });
        return;
      }
      nextRole = body.role;
    }

    let nextStatus = target.status;
    if (body.status === "active" || body.status === "disabled") {
      nextStatus = body.status;
    }

    let nextUsername = target.username;
    if (typeof body.username === "string" && body.username.trim().length > 0) {
      nextUsername = normalizeUsername(body.username);
      if (nextUsername.length < 3) {
        res.status(400).json({ message: "Username must be at least 3 characters." });
        return;
      }
      if (db.auth.users.some((u) => u.username === nextUsername && u.id !== target.id)) {
        res.status(400).json({ message: "That username is already in use." });
        return;
      }
    }

    // Last-active-owner safety: don't allow changing role away from owner or disabling
    // if this is the only active owner.
    const wouldRemoveOwner =
      target.role === "owner" && (nextRole !== "owner" || nextStatus !== "active");
    if (wouldRemoveOwner && countActiveOwners(db, target.id) === 0) {
      res.status(400).json({
        message: "You can't disable or downgrade the only active owner. Promote another owner first.",
      });
      return;
    }

    db.auth.users = db.auth.users.map((u) =>
      u.id === target.id
        ? {
            ...u,
            role: nextRole,
            status: nextStatus,
            username: nextUsername,
            mustChangePassword:
              typeof body.mustChangePassword === "boolean" ? body.mustChangePassword : u.mustChangePassword,
          }
        : u,
    );
    if (nextStatus === "disabled") forceLogoutUserSessions(db, target.id);
    if (nextUsername !== target.username) {
      db.auth.activityLogs = db.auth.activityLogs.map((e) =>
        e.userId === target.id ? { ...e, username: nextUsername } : e,
      );
    }
    await writeDb(db);
    res.json({ auth: buildAuthSnapshot(db, req) });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Update failed." });
  }
});

router.post("/cc/auth/admin-users/:id/reset-password", async (req, res) => {
  try {
    const db = await readDb();
    const actor = requirePermission(db, req, "manageAdmins");
    if (!actor) {
      res.status(403).json({ message: "Only admins with team management can reset passwords." });
      return;
    }
    const target = db.auth.users.find((u) => u.id === req.params.id);
    if (!target) {
      res.status(404).json({ message: "User not found." });
      return;
    }
    const body = (req.body ?? {}) as { password?: string; mustChangePassword?: boolean };
    const password = body.password ?? "";
    if (password.length < 8) {
      res.status(400).json({ message: "Temporary password must be at least 8 characters." });
      return;
    }
    db.auth.users = db.auth.users.map((u) =>
      u.id === target.id
        ? {
            ...u,
            passwordHash: hashPassword(password),
            mustChangePassword: body.mustChangePassword !== false,
          }
        : u,
    );
    forceLogoutUserSessions(db, target.id);
    await writeDb(db);
    res.json({
      auth: buildAuthSnapshot(db, req),
      invite: { username: target.username, password, role: target.role },
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Reset failed." });
  }
});

router.delete("/cc/auth/admin-users/:id", async (req, res) => {
  try {
    const db = await readDb();
    const actor = requirePermission(db, req, "manageAdmins");
    if (!actor) {
      res.status(403).json({ message: "Only admins with team management can delete users." });
      return;
    }
    const target = db.auth.users.find((u) => u.id === req.params.id);
    if (!target) {
      res.status(404).json({ message: "User not found." });
      return;
    }
    if (target.id === actor.id) {
      res.status(400).json({ message: "You can't delete your own account." });
      return;
    }
    if (target.role === "owner" && countActiveOwners(db, target.id) === 0) {
      res.status(400).json({
        message: "You can't delete the only active owner. Promote another owner first.",
      });
      return;
    }
    db.auth.users = db.auth.users.filter((u) => u.id !== target.id);
    forceLogoutUserSessions(db, target.id);
    await writeDb(db);
    res.json({ auth: buildAuthSnapshot(db, req) });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Delete failed." });
  }
});

// -------- MESSAGES --------
router.post("/cc/messages", async (req, res) => {
  try {
    const body = (req.body ?? {}) as {
      name?: string;
      phone?: string;
      email?: string;
      subject?: string;
      message?: string;
      type?: string;
      contactMethod?: string;
    };
    const name = (body.name ?? "").trim();
    const message = (body.message ?? "").trim();
    if (!name || !message) {
      res.status(400).json({ message: "Name and message are required." });
      return;
    }
    const phone = (body.phone ?? "").trim();
    const email = (body.email ?? "").trim();
    if (!phone && !email) {
      res.status(400).json({ message: "Provide a phone number or email so we can reply." });
      return;
    }
    const subject = (body.subject ?? "").trim();
    const type = (body.type ?? "contact").trim() || "contact";
    const created = await createMessage({
      name,
      phone,
      email,
      subject,
      message,
      type,
      contactMethod: (body.contactMethod ?? "").trim(),
    });
    await createNotification({
      type: "message",
      title: `New message from ${name}`,
      body: subject || message.slice(0, 140),
      relatedKind: "message",
      relatedId: created.id,
    });

    // Best-effort email + SMS alert
    const subjectLine = `New customer message from ${name}`;
    const summaryLines = [
      `New message via Candy Crackzzz`,
      ``,
      `Name: ${name}`,
      `Phone: ${phone || "N/A"}`,
      `Email: ${email || "N/A"}`,
      `Type: ${type}`,
      subject ? `Subject: ${subject}` : "",
      ``,
      `Message:`,
      message,
    ]
      .filter(Boolean)
      .join("\n");
    void Promise.allSettled([
      sendResendEmail(
        process.env["ORDER_NOTIFICATION_EMAIL"] || process.env["ADMIN_NOTIFICATION_EMAIL"] || "",
        subjectLine,
        summaryLines,
      ),
      sendTwilioSms(
        process.env["ORDER_NOTIFICATION_PHONE"] || process.env["ADMIN_NOTIFICATION_PHONE"] || "",
        `New message from ${name}${phone ? ` (${phone})` : ""}: ${message.slice(0, 120)}`,
      ),
    ]);

    res.status(201).json({ ok: true, id: created.id });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Could not save message." });
  }
});

router.get("/cc/messages", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  try {
    const includeArchived = req.query.includeArchived === "true";
    const messages = await listMessages(includeArchived);
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Could not load messages." });
  }
});

router.post("/cc/messages/:id/read", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  try {
    const body = (req.body ?? {}) as { read?: boolean };
    const updated = await markMessageRead(req.params.id, body.read !== false);
    if (!updated) {
      res.status(404).json({ message: "Message not found." });
      return;
    }
    res.json({ message: updated });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Update failed." });
  }
});

router.post("/cc/messages/:id/archive", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  try {
    const body = (req.body ?? {}) as { archived?: boolean };
    const updated = await archiveMessage(req.params.id, body.archived !== false);
    if (!updated) {
      res.status(404).json({ message: "Message not found." });
      return;
    }
    res.json({ message: updated });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Update failed." });
  }
});

router.delete("/cc/messages/:id", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  try {
    const ok = await deleteMessage(req.params.id);
    if (!ok) {
      res.status(404).json({ message: "Message not found." });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Delete failed." });
  }
});

// -------- NOTIFICATIONS --------
router.get("/cc/notifications", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  try {
    const notifications = await listNotifications();
    const unread = notifications.filter((n) => !n.readAt).length;
    res.json({ notifications, unread });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Could not load notifications." });
  }
});

router.post("/cc/notifications/:id/read", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  try {
    const body = (req.body ?? {}) as { read?: boolean };
    const updated = await markNotificationRead(req.params.id, body.read !== false);
    if (!updated) {
      res.status(404).json({ message: "Notification not found." });
      return;
    }
    res.json({ notification: updated });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Update failed." });
  }
});

router.post("/cc/notifications/read-all", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  try {
    const updated = await markAllNotificationsRead();
    res.json({ ok: true, updated });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Update failed." });
  }
});

router.delete("/cc/notifications/:id", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  try {
    const ok = await deleteNotification(req.params.id);
    if (!ok) {
      res.status(404).json({ message: "Notification not found." });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Delete failed." });
  }
});

// -------- ANALYTICS --------
router.post("/cc/analytics/view", async (req, res) => {
  try {
    const body = (req.body ?? {}) as {
      path?: string;
      title?: string;
      referrer?: string;
      visitorId?: string;
      sessionId?: string;
      deviceType?: string;
      retentionLimit?: number;
    };
    const rawPath = (body.path ?? "").trim();
    if (!rawPath || !rawPath.startsWith("/")) {
      res.status(400).json({ ok: false, message: "Invalid path." });
      return;
    }
    if (rawPath.startsWith("/admin") || rawPath.startsWith("/api")) {
      res.status(200).json({ ok: true, skipped: true, reason: "internal route" });
      return;
    }
    const visitorId = (body.visitorId ?? "").slice(0, 80);
    if (!shouldRecordView(visitorId || (req.ip ?? "anon"), rawPath)) {
      res.status(200).json({ ok: true, skipped: true, reason: "duplicate within window" });
      return;
    }
    const userAgent = (req.headers["user-agent"] ?? "").toString().slice(0, 500);
    await recordAnalyticsView({
      path: rawPath.slice(0, 250),
      title: (body.title ?? "").slice(0, 250),
      referrer: (body.referrer ?? "").slice(0, 250),
      visitorId,
      sessionId: (body.sessionId ?? "").slice(0, 80),
      deviceType: (body.deviceType ?? "").slice(0, 20),
      userAgent,
      retentionLimit: body.retentionLimit,
    });
    if (body.retentionLimit) {
      void pruneAnalytics(body.retentionLimit).catch(() => undefined);
    }
    res.status(201).json({ ok: true });
  } catch (error) {
    res
      .status(500)
      .json({ ok: false, message: error instanceof Error ? error.message : "Failed." });
  }
});

router.get("/cc/analytics/summary", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  try {
    const summary = await getAnalyticsSummary();
    res.json(summary);
  } catch (error) {
    res
      .status(500)
      .json({ message: error instanceof Error ? error.message : "Could not load analytics." });
  }
});

router.get("/cc/analytics/recent", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  try {
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10) || 50));
    const recentViews = await listRecentAnalyticsViews(limit);
    res.json({ recentViews });
  } catch (error) {
    res
      .status(500)
      .json({ message: error instanceof Error ? error.message : "Could not load analytics." });
  }
});

// -------- ORDER (public, with notification) --------
router.post("/cc/orders/notify", async (req, res) => {
  try {
    const body = (req.body ?? {}) as {
      businessName?: string;
      toEmail?: string;
      toPhone?: string;
      order?: {
        id?: string;
        customerName?: string;
        phone?: string;
        email?: string;
        requestedDate?: string;
        requestedTime?: string;
        pickupOrDelivery?: "pickup" | "delivery";
        deliveryAddress?: string;
        notes?: string;
        specialInstructions?: string;
        eventType?: string;
        paymentMethod?: string;
        total?: number;
        items?: Array<{ name?: string; quantity?: number; price?: number | null }>;
      };
    };
    const order = body.order;
    if (!order || !order.customerName || !Array.isArray(order.items) || order.items.length === 0) {
      res.status(400).json({ ok: false, message: "Order details are missing or invalid." });
      return;
    }

    const businessName =
      (body.businessName ?? "").trim() || process.env["BUSINESS_NAME"] || "Candy Crackzzz";
    const text = buildOrderMessage(order, businessName);
    const subject = `New order request - ${order.customerName}`;
    const destinationEmail =
      (process.env["ORDER_NOTIFICATION_EMAIL"] ?? "").trim() || (body.toEmail ?? "").trim();
    const destinationPhone =
      (process.env["ORDER_NOTIFICATION_PHONE"] ?? "").trim() || (body.toPhone ?? "").trim();

    await createNotification({
      type: "order",
      title: `New order from ${order.customerName}`,
      body: `${order.items.length} item${order.items.length === 1 ? "" : "s"} • $${(order.total ?? 0).toFixed(2)}`,
      relatedKind: "order",
      relatedId: order.id ?? "",
    });

    const [emailResult, smsResult] = await Promise.all([
      sendResendEmail(destinationEmail, subject, text),
      sendTwilioSms(destinationPhone, text),
    ]);

    res.status(200).json({
      ok: true,
      accepted: true,
      saved: true,
      email: emailResult,
      sms: smsResult,
      message: "Order notification handled.",
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: error instanceof Error ? error.message : "Failed." });
  }
});

// -------- PROVIDER STATUS --------
router.get("/cc/status", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  try {
    // Future-API readiness: report presence-only flags for optional providers.
    // Never expose actual key values — only booleans.
    const optionalProviders = {
      openai: {
        configured: !!process.env["OPENAI_API_KEY"],
        missing: process.env["OPENAI_API_KEY"] ? [] : ["OPENAI_API_KEY"],
        purpose: "Smart product descriptions and AI assist.",
      },
      googleMaps: {
        configured: !!process.env["GOOGLE_MAPS_API_KEY"],
        missing: process.env["GOOGLE_MAPS_API_KEY"] ? [] : ["GOOGLE_MAPS_API_KEY"],
        purpose: "Driver directions and address autocomplete.",
      },
      push: {
        configured: !!process.env["VAPID_PUBLIC_KEY"] && !!process.env["VAPID_PRIVATE_KEY"],
        missing: [
          process.env["VAPID_PUBLIC_KEY"] ? null : "VAPID_PUBLIC_KEY",
          process.env["VAPID_PRIVATE_KEY"] ? null : "VAPID_PRIVATE_KEY",
        ].filter((value): value is string => !!value),
        purpose: "Browser push notifications for new orders.",
      },
    };

    res.json({
      database: { connected: isUsingDatabase(), kind: isUsingDatabase() ? "postgres" : "file" },
      session: {
        sessionSecretConfigured: !!process.env["SESSION_SECRET"],
        adminUsernameConfigured: !!process.env["ADMIN_USERNAME"],
        adminPasswordConfigured: !!process.env["ADMIN_PASSWORD"],
      },
      email: emailProviderStatus(),
      sms: smsProviderStatus(),
      providers: optionalProviders,
      businessName: process.env["BUSINESS_NAME"] ?? null,
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Status failed." });
  }
});

// -------- TEST EMAIL / SMS (admin) --------
router.post("/cc/notifications/test-email", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  try {
    const to =
      ((req.body?.to as string) ?? "").trim() ||
      (process.env["ORDER_NOTIFICATION_EMAIL"] ?? "").trim();
    if (!to) {
      res.status(400).json({ ok: false, message: "No destination email configured. Set ORDER_NOTIFICATION_EMAIL or pass `to`." });
      return;
    }
    const result = await sendResendEmail(
      to,
      "Candy Crackzzz test email",
      "This is a test email from your Candy Crackzzz admin dashboard. If you got this, email alerts are working.",
    );
    res.json({ ok: result.sent, result });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Failed." });
  }
});

router.post("/cc/notifications/test-sms", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  try {
    const to =
      ((req.body?.to as string) ?? "").trim() ||
      (process.env["ORDER_NOTIFICATION_PHONE"] ?? "").trim();
    if (!to) {
      res.status(400).json({ ok: false, message: "No destination phone configured. Set ORDER_NOTIFICATION_PHONE or pass `to`." });
      return;
    }
    const result = await sendTwilioSms(
      normalizePhoneNumber(to),
      "Candy Crackzzz test SMS — text alerts are working.",
    );
    res.json({ ok: result.sent, result });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Failed." });
  }
});

// -------- DIRECTIONS --------
router.post("/cc/directions", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  try {
    const body = (req.body ?? {}) as {
      origin?: string;
      originAddress?: string;
      destination?: string;
      mode?: string;
    };

    const destination = (body.destination ?? "").trim();
    if (!destination) {
      res.status(400).json({ ok: false, message: "destination is required." });
      return;
    }

    const rawOrigin = (body.origin ?? "").trim();
    const rawOriginAddress = (body.originAddress ?? "").trim();
    const originRaw = rawOrigin || rawOriginAddress;

    if (!originRaw) {
      res.status(400).json({ ok: false, message: "origin or originAddress is required." });
      return;
    }

    const mode = (body.mode ?? "driving").toLowerCase();
    const originUsed: "current_location" | "business_address" = rawOrigin
      ? "current_location"
      : "business_address";

    const encodedOrigin = encodeURIComponent(originRaw);
    const encodedDest = encodeURIComponent(destination);
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodedOrigin}&destination=${encodedDest}&travelmode=${mode}`;

    const apiKey = process.env["GOOGLE_MAPS_API_KEY"];
    if (!apiKey) {
      res.json({
        ok: false,
        message: "Google Maps API key is not configured. The directions link is still available.",
        mapsUrl,
        originUsed,
        provider: "google",
      });
      return;
    }

    const params = new URLSearchParams({
      origin: originRaw,
      destination,
      mode,
      key: apiKey,
    });

    const apiResponse = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`,
    );

    if (!apiResponse.ok) {
      res.json({
        ok: false,
        message: "Google Maps API request failed. The directions link is still available.",
        mapsUrl,
        originUsed,
        provider: "google",
      });
      return;
    }

    const data = await apiResponse.json() as {
      status: string;
      routes?: {
        legs?: {
          distance?: { text: string; value: number };
          duration?: { text: string; value: number };
        }[];
      }[];
    };

    if (data.status !== "OK" || !data.routes?.length) {
      res.json({
        ok: false,
        message: `Route not found (${data.status}). The directions link is still available.`,
        mapsUrl,
        originUsed,
        provider: "google",
      });
      return;
    }

    const leg = data.routes[0]?.legs?.[0];
    res.json({
      ok: true,
      distanceText: leg?.distance?.text ?? "",
      distanceMeters: leg?.distance?.value ?? 0,
      durationText: leg?.duration?.text ?? "",
      durationSeconds: leg?.duration?.value ?? 0,
      originUsed,
      mapsUrl,
      provider: "google",
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : "Directions request failed.",
    });
  }
});

// -------- AI — PRODUCT DESCRIPTION --------
router.post("/cc/ai/product-description", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  try {
    const { openAiChat, isOpenAiConfigured } = await import("../lib/openai.js");
    if (!isOpenAiConfigured()) {
      res.status(503).json({
        ok: false,
        message: "AI tools are not configured. Add OPENAI_API_KEY to Replit Secrets and restart the API server.",
      });
      return;
    }

    const body = (req.body ?? {}) as {
      productName?: string;
      category?: string;
      flavors?: string[];
      notes?: string;
      tone?: string;
    };
    const productName = (body.productName ?? "").trim();
    if (!productName) {
      res.status(400).json({ ok: false, message: "productName is required." });
      return;
    }

    const category = (body.category ?? "candy-coated fruit").trim();
    const flavors = (body.flavors ?? []).filter(Boolean).join(", ");
    const notes = (body.notes ?? "").trim();
    const tone = (body.tone ?? "bold and fun, streetwear-inspired").trim();

    const system =
      "You are a copywriting assistant for Candy Crackzzz — a bold, streetwear-inspired candy-coated fruit brand. " +
      "Write concise, energetic, on-brand copy. Never invent prices, medical claims, THC/cannabis, alcohol, or age-restricted content. " +
      "Do not fabricate availability. Keep descriptions under 100 words.";

    const userPrompt =
      `Product name: ${productName}\n` +
      `Category: ${category}\n` +
      (flavors ? `Flavors: ${flavors}\n` : "") +
      (notes ? `Admin notes: ${notes}\n` : "") +
      `Tone: ${tone}\n\n` +
      "Write:\n" +
      "1. A short product description (1–3 punchy sentences, under 80 words).\n" +
      "2. Three alternate product name ideas (comma-separated, on one line prefixed with 'Names:').\n" +
      "Return ONLY these two sections, no extra commentary.";

    const result = await openAiChat([
      { role: "system", content: system },
      { role: "user", content: userPrompt },
    ], { maxTokens: 300, temperature: 0.85 });

    if (!result.ok) {
      res.status(502).json(result);
      return;
    }

    const lines = result.text.split("\n").map(l => l.trim()).filter(Boolean);
    const namesLine = lines.find(l => /^names?:/i.test(l)) ?? "";
    const descLines = lines.filter(l => !/^names?:/i.test(l));
    const description = descLines.join(" ").trim();
    const suggestedNames = namesLine
      .replace(/^names?:\s*/i, "")
      .split(",")
      .map(n => n.trim())
      .filter(Boolean);

    res.json({ ok: true, description, suggestedNames });
  } catch (error) {
    res.status(500).json({ ok: false, message: error instanceof Error ? error.message : "AI generation failed." });
  }
});

// -------- AI — PROMO MESSAGE --------
router.post("/cc/ai/promo-message", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  try {
    const { openAiChat, isOpenAiConfigured } = await import("../lib/openai.js");
    if (!isOpenAiConfigured()) {
      res.status(503).json({
        ok: false,
        message: "AI tools are not configured. Add OPENAI_API_KEY to Replit Secrets and restart the API server.",
      });
      return;
    }

    const body = (req.body ?? {}) as {
      campaignType?: string;
      audience?: string;
      offer?: string;
      channel?: string;
    };
    const offer = (body.offer ?? "").trim();
    if (!offer) {
      res.status(400).json({ ok: false, message: "offer is required." });
      return;
    }

    const campaignType = (body.campaignType ?? "promo").trim();
    const audience = (body.audience ?? "customers").trim();
    const channel = (body.channel ?? "sms").toLowerCase().trim();
    const isSms = channel === "sms";

    const system =
      "You are a marketing copywriter for Candy Crackzzz, a bold candy-coated fruit brand. " +
      "Write short, exciting promo messages. " +
      "Safety rules: never include fake prices, medical claims, THC/cannabis, alcohol, or age-restricted content. " +
      "Do not invent availability or terms not provided. " +
      (isSms ? "SMS messages must be under 160 characters." : "Keep messages under 50 words.");

    const userPrompt =
      `Campaign type: ${campaignType}\n` +
      `Audience: ${audience}\n` +
      `Offer: ${offer}\n` +
      `Channel: ${channel}\n\n` +
      "Write one ready-to-send promotional message. Return only the message text, no labels or commentary.";

    const result = await openAiChat([
      { role: "system", content: system },
      { role: "user", content: userPrompt },
    ], { maxTokens: isSms ? 80 : 200, temperature: 0.85 });

    if (!result.ok) {
      res.status(502).json(result);
      return;
    }

    res.json({ ok: true, message: result.text });
  } catch (error) {
    res.status(500).json({ ok: false, message: error instanceof Error ? error.message : "AI generation failed." });
  }
});

// -------- AI — REFERRAL MESSAGE --------
router.post("/cc/ai/referral-message", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  try {
    const { openAiChat, isOpenAiConfigured } = await import("../lib/openai.js");
    if (!isOpenAiConfigured()) {
      res.status(503).json({
        ok: false,
        message: "AI tools are not configured. Add OPENAI_API_KEY to Replit Secrets and restart the API server.",
      });
      return;
    }

    const body = (req.body ?? {}) as {
      type?: string;
      context?: string;
    };
    const refType = (body.type ?? "customer_referral").trim();
    const context = (body.context ?? "").trim();

    const system =
      "You are a copywriting assistant for Candy Crackzzz, a bold candy-coated fruit brand. " +
      "Write energetic, friendly referral program messages. " +
      "Never include medical claims, THC/cannabis, alcohol, or age-restricted content. " +
      "Do not invent reward amounts or terms not provided. Keep messages under 60 words.";

    const userPrompt =
      `Referral program type: ${refType}\n` +
      (context ? `Context: ${context}\n` : "") +
      "\nWrite one clear, on-brand referral message the admin can use as a template. Return only the message text.";

    const result = await openAiChat([
      { role: "system", content: system },
      { role: "user", content: userPrompt },
    ], { maxTokens: 150, temperature: 0.8 });

    if (!result.ok) {
      res.status(502).json(result);
      return;
    }

    res.json({ ok: true, message: result.text });
  } catch (error) {
    res.status(500).json({ ok: false, message: error instanceof Error ? error.message : "AI generation failed." });
  }
});

// -------- AI GENERATE (legacy generic endpoint, kept for compatibility) --------
router.post("/cc/ai/generate", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  try {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) {
      res.status(503).json({ ok: false, message: "AI writing is not configured. Add an OPENAI_API_KEY secret in the Replit Secrets panel to enable it." });
      return;
    }

    const body = (req.body ?? {}) as { prompt?: string; context?: string; type?: string };
    const prompt = (body.prompt ?? "").trim();
    if (!prompt) {
      res.status(400).json({ ok: false, message: "Missing prompt." });
      return;
    }

    const systemContext = body.context ?? "You are a helpful copywriting assistant for a candy-coated fruit and treats brand called Candy Crackzzz. Write engaging, on-brand product descriptions with a sweet, bold streetwear-inspired voice. Keep descriptions concise and impactful.";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemContext },
          { role: "user", content: prompt },
        ],
        max_tokens: 300,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      res.status(502).json({ ok: false, message: (err as { error?: { message?: string } }).error?.message ?? "OpenAI request failed." });
      return;
    }

    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    res.json({ ok: true, text });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "AI generation failed." });
  }
});

export default router;
