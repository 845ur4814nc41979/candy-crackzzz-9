import { pgTable, text, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";

export const ccStateTable = pgTable("cc_state", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ccMessagesTable = pgTable("cc_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone").default(""),
  email: text("email").default(""),
  subject: text("subject").default(""),
  message: text("message").notNull(),
  type: text("type").default("contact"),
  contactMethod: text("contact_method").default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});

export const ccNotificationsTable = pgTable("cc_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").default(""),
  relatedKind: text("related_kind").default(""),
  relatedId: text("related_id").default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
});

export const ccAnalyticsViewsTable = pgTable("cc_analytics_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  path: text("path").notNull(),
  title: text("title").default(""),
  referrer: text("referrer").default(""),
  visitorId: text("visitor_id").default(""),
  sessionId: text("session_id").default(""),
  deviceType: text("device_type").default(""),
  userAgent: text("user_agent").default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CcMessage = typeof ccMessagesTable.$inferSelect;
export type CcNotification = typeof ccNotificationsTable.$inferSelect;
export type CcAnalyticsView = typeof ccAnalyticsViewsTable.$inferSelect;
