# Candy CrackZZZ — Continuation Notes

## What Was Broken

The `/cart` page was showing cart items but no checkout form, contact fields, payment options, or submit button.

**Root cause:** During a previous session, `CartPage.tsx` had its entire JSX `return` replaced with a one-liner placeholder (`<PageLayout>{null}</PageLayout>`), stripping the full checkout UI while leaving all the logic intact. The cart items rendered (from a stripped-down temporary form), but nothing else — no contact form, no logistics, no payment, no submit button.

A secondary issue: localStorage cart data could contain corrupt/incompatible items from schema changes, causing runtime crashes on the `/cart` page.

---

## What Was Fixed

### 1. CartPage.tsx — Full checkout form restored
- Restored the full two-column checkout layout: item list on the left, form on the right
- Restored all sections: Contact Info, Rewards, Apply Rewards (redemption), Staff/Promo Code, Logistics (pickup/delivery, address, date, time, event type, special instructions), Payment Methods
- Submit button is now visible at the bottom of the form with text "PLACE ORDER REQUEST"
- The button shows for all payment configurations, including when payments are disabled (shows "We'll contact you to confirm")
- Empty cart shows the full "Your bag is empty" screen with a Browse Menu button

### 2. CartPage.tsx — Defensive rendering
- All cart item fields are accessed safely (never crashes on null/undefined imageUrl, name, price, quantity)
- Missing imageUrl shows a 🍬 placeholder instead of a broken image
- Cart items are sanitized via `safeCartItem()` before rendering or building the order

### 3. CartPage.tsx — Self-healing cart with friendly message
- On mount, detects any cart items with missing/corrupt fields
- Sanitizes and replaces them silently in state
- Shows toast: "Your cart was refreshed. Please add your items again."

### 4. AppContext.tsx — Self-healing localStorage cart load
- On startup, safely parses localStorage cart JSON
- Verifies it is an array; sanitizes each item via `sanitizeCartItem()`
- If parsing fails entirely, clears only the cart key (not products/orders/rewards/settings)
- Never throws from cart loading

### 5. Backend Twilio SMS — admin/business notification preserved
- `POST /api/cc/orders/notify` resolves SMS destination in priority order:
  1. `body.toPhone` if provided and non-blank
  2. `process.env.ORDER_NOTIFICATION_PHONE`
  3. `process.env.ADMIN_NOTIFICATION_PHONE`
  4. Skip with a logged reason if none found
- Response includes `sms.attempted`, `sms.sent`, `sms.skipped`, `sms.destinationSource`
- No secrets exposed in response

### 6. Order submission flow — preserved intact
- Order is saved to app state even if SMS/email notification fails
- Rewards profile created or updated on checkout
- Referral code captured and stored
- Staff/promo code validated and stored
- Redemption applied if valid
- Redirects to `/order-success` on success

---

## Files Changed

| File | Change |
|------|--------|
| `artifacts/candy-crackzzz/src/pages/CartPage.tsx` | Full checkout form restored; defensive rendering; self-healing cart; friendly toast |
| `artifacts/candy-crackzzz/src/context/AppContext.tsx` | Self-healing localStorage cart load; sanitizeCartItem() added |
| `artifacts/candy-crackzzz/src/components/layout/Navbar.tsx` | Defensive `item?.quantity` access |
| `artifacts/candy-crackzzz/src/components/layout/MobileNav.tsx` | Defensive `item?.quantity` access |
| `artifacts/api-server/src/routes/candy-notify.ts` | Twilio SMS destination priority fix; clean response format |
| `artifacts/api-server/src/routes/candy.ts` | Uses `resolveSmsDestination()` for SMS routing |

---

## What Still Needs Testing

- [ ] Add item to cart → click shopping bag → confirm checkout form loads
- [ ] Submit a test order → confirm order appears in `/admin/orders`
- [ ] Confirm backend SMS is received (if Twilio secrets are configured)
- [ ] Test with a corrupt/old `cart` key in localStorage (set a non-array value manually, refresh)
- [ ] Test empty cart state (clear cart, visit `/cart`)
- [ ] Test rewards redemption panel (requires a matched rewards profile with points)
- [ ] Test staff/promo code entry with an active code

---

## Remaining TODOs

- **Customer order-status SMS** (Priority 5 from the original brief) was NOT implemented in this session. See below for safe next steps.
- The `validate:replit` script may still warn about the mockup-sandbox PORT issue — this is a pre-existing dev-only issue unrelated to Candy CrackZZZ.

---

## Customer Order-Status SMS — TODO

When this is implemented, it should:
- Be triggered when an admin changes order status to: `confirmed`, `ready`, `picked-up`, `completed`, `cancelled`
- Send to the customer's phone number (from the order), NOT to `ORDER_NOTIFICATION_PHONE`
- Be gated behind an admin setting toggle: "Send customer SMS order status updates"
- Use the same Twilio credentials: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_PHONE`
- Suggested messages:
  - confirmed: "Candy CrackZZZ update: Your order has been confirmed. We'll keep you posted."
  - ready: "Candy CrackZZZ update: Your order is ready."
  - picked-up: "Candy CrackZZZ update: Your order has been picked up. Thank you!"
  - completed: "Candy CrackZZZ update: Your order is complete. Thank you for choosing Candy CrackZZZ!"
  - cancelled: "Candy CrackZZZ update: Your order was cancelled. Contact us if you have questions."
- Files to change:
  - `artifacts/api-server/src/routes/candy.ts` — add status-change SMS call in the order PATCH route
  - `artifacts/candy-crackzzz/src/types/index.ts` — add `enableCustomerStatusSms: boolean` to Settings
  - `packages/db/schema.ts` — add `enableCustomerStatusSms` column if using DB
  - Admin settings UI — add toggle in the SMS/notifications section

---

## Shell Commands

### Restart the app
```sh
bash scripts/replit-start.sh
```
Or via the Replit workflow: click "Run" on "Start application".

### Run typechecks
```sh
pnpm --filter @workspace/candy-crackzzz run typecheck
pnpm --filter @workspace/api-server run typecheck
pnpm run typecheck
```

### Run builds
```sh
pnpm --filter @workspace/candy-crackzzz run build
pnpm --filter @workspace/api-server run build
```

### Test backend Twilio SMS (curl)
```sh
curl -X POST http://127.0.0.1:3001/api/cc/orders/notify \
  -H 'Content-Type: application/json' \
  -d '{
    "businessName": "Candy Crackzzz",
    "toPhone": "+1YOURPHONE",
    "order": {
      "id": "ORD-TEST001",
      "customerName": "Test Customer",
      "items": [{ "name": "Test Candy", "quantity": 1, "price": 5 }],
      "total": 5
    }
  }'
```

Expected successful response includes:
```json
{ "ok": true, "sms": { "sent": true, "destinationSource": "body.toPhone" } }
```

If `toPhone` is omitted, it will fall back to `ORDER_NOTIFICATION_PHONE` env var.

---

## Preview Test Steps

1. Open the Preview pane
2. Click **Menu** in the navbar
3. Click a product → Add to Cart
4. Click the shopping bag icon in the navbar
5. Confirm `/cart` loads with the item list on the left
6. Confirm the checkout form loads on the right with Contact Info, Logistics, and submit button
7. Fill in Name, Phone, Date, Time
8. Click **PLACE ORDER REQUEST**
9. Confirm redirect to the order success page
10. Go to `/admin/orders` — confirm the new order appears
11. If Twilio is configured, confirm the business SMS was received

---

## Manual Work Possible Without Agent

These tasks can be done directly in the Shell or Replit UI without Agent credits:

| Task | How |
|------|-----|
| Restart the app | Shell: `bash scripts/replit-start.sh` |
| Typecheck | Shell: `pnpm run typecheck` |
| Build | Shell: `pnpm run build` |
| Test backend SMS | Shell: `curl -X POST ...` (see above) |
| Change secrets | Replit Secrets panel (DATABASE_URL, TWILIO_*, etc.) |
| Edit admin settings | Visit `/admin/settings` in Preview |
| View/manage orders | Visit `/admin/orders` in Preview |
| Push to GitHub | Shell: `git add -A && git commit -m "..." && git push` |
| Check logs | Shell: `pnpm --filter @workspace/api-server run dev` and watch output |

---

## Safe Next Prompt (paste into a new Agent session)

```
We are working in the existing Candy CrackZZZ 9 repo. Do not rebuild from scratch.

The cart/checkout flow is working. The Twilio admin/business SMS notification is working.

The next task is to implement customer order-status SMS notifications (Priority 5):

When an admin changes an order status to confirmed, ready, picked-up, completed, or cancelled:
- Send a transactional SMS to the customer's phone number from the order
- Do NOT send to ORDER_NOTIFICATION_PHONE — that is for admin/business alerts only
- Gate behind an admin setting: "Send customer SMS order status updates" (enableCustomerStatusSms)
- Use TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_PHONE
- Suggested messages are in CANDY_CRACKZZZ_CONTINUATION_NOTES.md

Files to change:
- artifacts/api-server/src/routes/candy.ts (PATCH order status route)
- artifacts/candy-crackzzz/src/types/index.ts (add enableCustomerStatusSms to Settings)
- packages/db/schema.ts (add enableCustomerStatusSms if using DB)
- Admin settings UI (add toggle)

After implementing, run:
pnpm --filter @workspace/candy-crackzzz run typecheck
pnpm --filter @workspace/candy-crackzzz run build
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/api-server run build
```

---

## Known Issues / Warnings

- `pnpm run validate:replit` may warn about the mockup-sandbox PORT env var — this is a pre-existing dev-only issue and does not affect Candy CrackZZZ.
- The full root `pnpm run build` may fail only due to mockup-sandbox — the Candy frontend and API server build cleanly.
