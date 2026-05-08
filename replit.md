# Candy Crackzzz

Candy Crackzzz is an e-commerce platform for ordering custom candies, featuring an admin panel for product, order, and customer message management.

## Run & Operate

- `pnpm run typecheck` — Full typecheck across all packages.
- `pnpm run build` — Typecheck and build all packages.
- `pnpm --filter @workspace/api-spec run codegen` — Regenerate API hooks and Zod schemas from OpenAPI spec.
- `pnpm --filter @workspace/db run push` — Push DB schema changes (development only).
- `pnpm --filter @workspace/api-server run dev` — Run API server locally.

**Required Environment Variables:**
- `DATABASE_URL`: PostgreSQL connection string.
- `ADMIN_USERNAME`: Default admin login username.
- `ADMIN_PASSWORD`: Default admin login password.
- `SESSION_SECRET`: Long random string for session signing and password hashing.

**Optional Environment Variables:**
- `RESEND_API_KEY`, `ORDER_FROM_EMAIL`, `ORDER_NOTIFICATION_EMAIL` (for email alerts via Resend)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_PHONE`, `ORDER_NOTIFICATION_PHONE` (for SMS alerts via Twilio)
- `BUSINESS_NAME` (for branding in notifications)

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite

## Where things live

- **Root**: pnpm workspace monorepo.
- **Frontend App**: `artifacts/candy-crackzzz` (React + Vite).
- **API Server**: `artifacts/api-server` (Express API).
- **Database Schema**: `packages/db/schema.ts`
- **API Contracts**: `packages/api-spec/openapi.yaml`
- **Permissions Map**: `artifacts/api-server/src/routes/candy-storage.ts` (server) and `artifacts/candy-crackzzz/src/lib/permissions.ts` (client).
- **Notification Sounds**: `artifacts/candy-crackzzz/src/lib/notificationSounds.ts`
- **Referral Sharing Logic**: `artifacts/candy-crackzzz/src/lib/referralShare.ts`
- **Branding Assets**: `attached_assets/candy_crackzzz_2_1776628492110.png` (logo)

## Architecture decisions

- **Monorepo Structure**: Uses pnpm workspaces for managing multiple packages, promoting code reuse and consistent dependency management.
- **Backend Persistence**: Prioritizes PostgreSQL with Drizzle ORM; falls back to a JSON file only if `DATABASE_URL` is unavailable (data loss on redeploy).
- **Authentication**: Multi-admin role-based access control with HMAC-SHA256 password hashing. Legacy SHA256 hashes auto-migrate on first login. Sessions are signed cookies.
- **Client-Side Data Hydration**: Core application state (like inventory items and transactions) is loaded at bootstrap and persisted via `apiPersistState` for a responsive UI.
- **Notification Sound Management**: Implements an explicit user interaction (click to enable) for audio playback due to browser autoplay policies, ensuring a reliable sound experience.

## Product

- **Public Storefront**: Home, Menu (with search/filters), Product Details, Gallery, Seasonal Specials, Custom Orders, Cart, Order Success, Contact pages.
- **Admin Panel**: Dashboard (stats, system health), Product Management (CRUD, image upload, inventory usage), Order Management (mobile-friendly), Customer Message Inbox, Review Moderation, Settings (general, messages, features, logistics), Branding (logo upload), Payment Method toggles, Account management (password change).
- **Referral Sharing**: Integrated referral system with Web Share API and fallbacks, allowing customers to share referral codes.
- **Real-time Notifications**: Admin bell icon polls for new orders/messages, with customizable sound alerts and visual indicators.
- **Inventory Tracking**: Comprehensive system for managing inventory items, tracking usage in product recipes, deducting from orders, and transaction history.
- **Analytics Dashboard**: Full-featured analytics including summary stats, top pages, device breakdown, traffic sources, and recent visits.

## User preferences

_Populate as you build_

## Gotchas

- **Admin Setup**: Public setup route `/admin/setup` is disabled; bootstrap admin comes from `ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars.
- **Permissions Sync**: Client and server-side permission maps (`artifacts/api-server/src/routes/candy-storage.ts` and `artifacts/candy-crackzzz/src/lib/permissions.ts`) must be kept in sync.
- **Notification Sounds**: Notification audio requires an explicit user interaction to unlock due to browser policies; debug with `localStorage.cc_audio_debug === '1'`.
- **Wouter Link Component**: When using `Wouter v3`, `Link` renders as an `<a>` directly; avoid nesting `<a>` tags inside `Link` components.

## Pointers

- **Replit Documentation**: Refer to the Replit documentation for information on using the Secrets pane and managing environment variables.
- **pnpm-workspace skill**: Consult the `pnpm-workspace` skill for details on workspace structure, TypeScript setup, and package specifics.
- **Drizzle ORM Documentation**: [https://orm.drizzle.team/](https://orm.drizzle.team/)
- **Zod Documentation**: [https://zod.dev/](https://zod.dev/)
- **Orval Documentation**: [https://orval.dev/](https://orval.dev/)
- **Express Documentation**: [https://expressjs.com/](https://expressjs.com/)
- **React Documentation**: [https://react.dev/](https://react.dev/)