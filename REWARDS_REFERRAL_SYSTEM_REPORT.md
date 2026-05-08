# Candy CrackZZZ — Rewards, Referral & Staff Referral System Report

_Generated: May 2026_

---

## Overview

This document describes the complete state of the rewards, customer referral, and staff referral systems in the Candy CrackZZZ platform after the current improvement sprint. It covers what was built, how each piece works, where the code lives, and what an admin can do with each feature.

---

## 1. What Changed in This Sprint

### 1.1 New Persistent State Collections

Four new top-level data collections were added to the app's persisted state. Each is stored in the PostgreSQL database (or JSON fallback) and rehydrated at boot just like existing collections such as orders and products.

| Collection | Key | Purpose |
|---|---|---|
| Reward Transactions | `rewardTransactions` | Immutable ledger of every point event (earned, redeemed, bonus, adjusted) |
| Referral Codes | `referralCodes` | Index of every unique referral code across customer profiles |
| Referral Events | `referralEvents` | Record of each time a referral code was used at checkout (success, rejected, self-referral, flagged) |
| Staff Referral Credits | `staffReferralCredits` | Commission records created when a staff/promo code is attached to a completed order |

### 1.2 Settings Additions

Two new settings fields were added to the `Settings` object under the staff referral section:

- **`staffReferralTrackOrderCount`** (boolean) — when enabled, each completed order with a staff code increments the code's usage counter even if no payout is tracked
- **`staffReferralTrackSalesVolume`** (boolean) — when enabled, the revenue from those orders is tracked for reporting

### 1.3 Order-Completion Logic (Idempotent)

When an admin marks an order as "completed" from the Orders page, two independent reward flows now run, each guarded against double-execution:

**Customer Rewards (guard: `!order.rewardsAwardedAt`)**
- Awards base points (dollars × pointsPerDollar, with optional double-points modifier)
- Awards first-order bonus if configured and this is the customer's first order
- Awards spend-threshold bonus if the order total crosses the configured amount
- Creates a `RewardTransaction` record for every point event
- If the customer used a valid referral code on their first order, awards both the referrer and the referred customer their bonus points, and creates a `ReferralEvent` record
- If the customer is new, registers a new `RewardProfile` and auto-generates a referral code, adding a `ReferralCode` entry to the index
- If the customer attempted to self-refer, logs a `ReferralEvent` with status `rejected` instead of awarding points

**Staff Referral Bonus (guard: `!order.employeeReferralBonusCalculatedAt`)**
- Runs only if a staff/promo code is attached to the order
- Checks whether the staff referral program is enabled in settings
- Calculates commission using the `calculateStaffReferralBonus` function in `staffReferral.ts`
- If a payout is due (status `pending` or `approved`), creates a `StaffReferralCredit` record
- Stamps the order with the calculated amount, status, note, and timestamp so it will never recalculate

---

## 2. Data Types & Shapes

### RewardTransaction

```
id: string
profileId: string
profilePhone: string
profileName?: string
type: 'earned' | 'redeemed' | 'adjusted' | 'referral-bonus' | 'birthday-bonus' | 'first-order-bonus' | 'spend-threshold-bonus'
points: number (negative for redemptions)
orderId?: string
note?: string
createdAt: ISO timestamp
createdBy: 'system' | 'admin'
```

### ReferralCode

```
id: string
code: string (uppercase, normalized)
ownerProfileId: string
ownerPhone: string
ownerName?: string
isActive: boolean
createdAt: ISO timestamp
```

### ReferralEvent

```
id: string
referralCode: string
referrerProfileId: string
referrerPhone: string
referrerName: string
referredPhone: string
referredName: string
orderId: string
status: 'pending' | 'approved' | 'completed' | 'rejected' | 'flagged'
referrerBonusPoints: number
referredBonusPoints: number
bonusAwardedAt?: ISO timestamp
isSelfReferral: boolean
createdAt: ISO timestamp
```

### StaffReferralCredit

```
id: string
staffCodeId?: string
staffCode: string
orderId: string
customerName: string
customerPhone: string
orderValue: number
commissionAmount: number
status: 'pending' | 'credited' | 'paid' | 'rejected'
paidAt?: ISO timestamp
createdAt: ISO timestamp
updatedAt?: ISO timestamp
adminNotes?: string
bonusNote?: string
```

---

## 3. Admin UI Changes

### 3.1 Rewardzzz Page (`/admin/rewards`)

**New: Transactions Tab**
A dedicated "Transactions" tab now sits between the Profiles and Referral Dashboard tabs. It shows:
- Summary stats: total transactions, total points earned, total points redeemed, count of referral bonuses
- A sortable table of all `RewardTransaction` records (newest first, capped at 100 visible rows) with customer name, phone, type badge, points (green for positive, red for negative), order reference, and note
- The tab badge shows the current transaction count

**Updated: Referral Dashboard Tab**
When referral events exist, a new "Referral Events" section appears at the bottom of the Referral Dashboard. It shows a table of `ReferralEvent` records with: date, code used, referrer info, referred customer info, status badge, and points awarded to each party. Self-referral attempts are labeled in red.

### 3.2 Staff Codezzz Page (`/admin/staff-codes`)

**New: Credit History Section**
When `staffReferralCredits` is non-empty, a "Credit History" table appears below the code list. It shows all credit records with: date, code, customer name and phone, order value, commission amount, status badge, and inline action buttons.

The inline actions follow a linear workflow:
- **Pending** → "Mark Credited" (moves to `credited`) or "Reject" (moves to `rejected`)
- **Credited** → "Mark Paid" (moves to `paid`, stamps `paidAt`)
- **Paid / Rejected** → shows the paid date or a dash

Status changes are persisted immediately via the existing state persistence mechanism (no page reload needed).

### 3.3 Orders Page (`/admin/orders`)

No visible UI changes — the order completion logic runs silently in the background when an order is moved to "completed". The existing badges (referral used, referral bonus awarded) already surface the outcome.

---

## 4. Code Locations

| Component | File Path |
|---|---|
| Types for all 4 new collections | `artifacts/candy-crackzzz/src/types/index.ts` |
| State storage keys + defaults | `artifacts/api-server/src/routes/candy-storage.ts` |
| React context (state + persistence) | `artifacts/candy-crackzzz/src/context/AppContext.tsx` |
| Rewards & referral calculation | `artifacts/candy-crackzzz/src/lib/rewards.ts` |
| Staff referral calculation | `artifacts/candy-crackzzz/src/lib/staffReferral.ts` |
| Order completion + credits creation | `artifacts/candy-crackzzz/src/pages/admin/AdminOrdersReferralBadges.tsx` |
| Transactions tab + referral events | `artifacts/candy-crackzzz/src/pages/admin/AdminRewards.tsx` |
| Credit history + status actions | `artifacts/candy-crackzzz/src/pages/admin/AdminStaffCodes.tsx` |

---

## 5. How the Flows Work End to End

### Customer Referral Flow

1. Customer A places an order and opts into rewards. Their profile is created on order completion, and a unique referral code (e.g. `JANE-X7KQ`) is generated and stored in both the `RewardProfile` and the `referralCodes` collection.
2. Customer A shares their code (via the Rewards page share button or manually).
3. Customer B places their first order and enters the code at checkout.
4. When the admin marks Customer B's order "completed", the system detects the referral code, verifies it belongs to a different customer, and confirms it's Customer B's first completed order.
5. Customer B receives their referred-friend bonus points. Customer A receives their referrer bonus points. Both profiles are updated. A `ReferralEvent` with status `completed` is created. Two `RewardTransaction` records (one per profile) are created with type `referral-bonus`.
6. The Referral Dashboard and Transactions tabs in the admin show the event immediately.

### Staff Code Flow

1. Admin creates a staff code (e.g. `CREW-SARA`) via the Staff Codezzz page with payout tracking enabled.
2. Staff member shares the code or a URL with `?staffRef=CREW-SARA`. Customers who visit that URL have the code auto-applied at checkout.
3. Customer places an order with the code attached.
4. When the admin marks the order "completed", the system calculates the commission based on the code's configured rate (flat fee, percentage, or points).
5. A `StaffReferralCredit` record is created with status `pending`. The order is stamped with the calculated amount, status, and timestamp.
6. The Credit History section on the Staff Codezzz page shows the pending credit. The admin can mark it credited (logged/tracked) and then paid (when cash/transfer is sent), or reject it if the order is disputed.

### Idempotency

Both flows use timestamp stamps as guards:
- `rewardsAwardedAt` prevents re-awarding customer points if the order status is toggled
- `employeeReferralBonusCalculatedAt` prevents creating duplicate staff credits

This means it is safe to move an order back to "pending" and then "completed" again — points and credits will only be created once.

---

## 6. Settings Reference

All settings live in the Rewardzzz → Settings tab.

| Setting | What it controls |
|---|---|
| Enable Rewards Program | Master switch. Off = no points awarded, no referral bonuses |
| Points per Dollar | Base earning rate. Fractional values supported (e.g. 0.5 = half a point per dollar) |
| Double Points Mode | Multiplies base earning by 2 |
| Max Points Per Order | Cap per order (0 = no cap) |
| Min Points to Redeem | Minimum balance before redemption is allowed |
| Award on Completed Order | If off, points are never automatically awarded; admin must award manually |
| First-Order Bonus | Extra points for a customer's very first order |
| Birthday Bonus | Extra points during birthday month (requires birthday on profile) |
| Spend Threshold Bonus | Bonus when order total exceeds a configured dollar amount |
| Redemption Tiers | Three configurable (points → discount) tiers |
| Enable Customer Referrals | Master switch for customer referral bonuses |
| Referrer Bonus Points | Points given to the person who shared their code |
| Referred Friend Bonus Points | Points given to the friend who used the code |
| Minimum Order Amount for Referral | Minimum order size to qualify for referral bonuses |
| Bonus on First Order Only | Locks referral bonus to the referred friend's very first order |
| Allow Stacking with Promos | Whether referral bonuses stack with discount promotions |
| Enable Staff & Promo Code Entry | Shows the code input field at checkout |
| Track Payout by Default | New codes default to having payout tracking on |
| Track Order Count | Count completed orders per staff code even without payout |
| Track Sales Volume | Sum revenue of completed orders per staff code |

---

## 7. Known Constraints & Notes

- **Referral bonus is first-order-only by default.** The "Bonus on First Order Only" setting must be off to award referral bonuses on repeat orders from the same referred customer.
- **Self-referrals are blocked.** If a customer enters their own referral code at checkout, a `ReferralEvent` with status `rejected` is logged but no points are awarded. There is no error shown to the customer at checkout — rejection is silent.
- **Staff credits are append-only.** Rejecting or paying a credit does not delete the record; it updates its status. This preserves the full audit trail.
- **The `referralCodes` index is self-healing.** On bootstrap, any `RewardProfile` that has a `referralCode` set but is not yet in the `referralCodes` collection is automatically indexed. This means existing customers' codes are always discoverable without a migration.
- **The `mockup-sandbox` package requires a `PORT` env var to build.** This is a pre-existing dev-only constraint unrelated to this sprint; all production packages (candy-crackzzz, api-server) build and typecheck cleanly.
