import type { AdminRole } from '@/types';
import type { DemoTourId } from '@/lib/demoMode';

export interface DemoStep {
  title: string;
  body: string;
  /** Optional hint shown as a small tag at the bottom of the card. */
  hint?: string;
}

export interface DemoTour {
  id: DemoTourId;
  title: string;
  intro: string;
  steps: DemoStep[];
  /** Audience label shown in the launcher prompt. */
  audience: string;
}

const SAFETY_HINT = 'Demo mode does not send real notifications, charge money, or expose any secret keys.';

const BUILDER_TOUR: DemoTour = {
  id: 'admin',
  title: 'Builder Tour',
  audience: 'Owner / Builder',
  intro: 'A quick walk-through of every area you control as the site builder.',
  steps: [
    { title: '1. Dashboard', body: 'This is mission control. You see active orders, new requests, products, revenue, rewards activity, and system status at a glance.' },
    { title: '2. Notifications', body: 'The bell at the top right surfaces new orders and messages. Use the unlock banner once to allow notification sounds in this browser.' },
    { title: '3. Orders', body: 'Open Orders to see every request. You can filter by status and move orders through new → confirmed → ready → completed. Cancelling releases any pending reward.' },
    { title: '4. Messages', body: 'Customer inquiries from the Contact page land here. Respond, mark read, or archive without leaving the dashboard.' },
    { title: '5. Products', body: 'Open Products to add, edit, hide, or sell-out items. Click an item to edit price, description, category and availability.' },
    { title: '6. Product Image', body: 'Inside an item, click the image box to swap or upload a new photo. Save and it updates instantly on the public site.' },
    { title: '7. Merch', body: 'Merch lives next to Products. Same flow: add an item, set price/sizes, upload an image, and toggle sold-out states.' },
    { title: '8. Smart Description', body: 'Both Products and Merch include a Smart Description Generator. It works locally now; if you add an OpenAI key later, it can auto-upgrade.' },
    { title: '9. Rewards Setup', body: 'Configure points-per-dollar, tier discounts, double-points days, first-order bonus, and birthday offers from the Rewards admin page.' },
    { title: '10. Referrals', body: 'Referrals reuse the same rewards engine. Toggle the program, set referrer/referee bonuses, and pick when bonuses unlock.' },
    { title: '11. Campaigns', body: 'Use Campaigns for promo blasts, holiday announcements, and seasonal pushes. Drafts are local; live sends require a connected channel.' },
    { title: '12. Reviews & Photos', body: 'Approve, hide, or feature customer reviews. Reviews can include a customer photo (≤ 2.5 MB) which displays publicly when approved.' },
    { title: '13. Team', body: 'Open Team to invite staff, site admins, system admins, campaign admins, viewers, and delivery drivers. Each role gets a tailored permission set.' },
    { title: '14. Delivery Driver Role', body: 'Drivers see only the new Deliveries page: address, directions link, status updates, and notes — never settings or financials.' },
    { title: '15. Settings', body: 'Site Settings cover branding, payments, pickup/delivery, ordering toggles, contact info, and the public site copy.' },
    { title: '16. System & API Readiness', body: 'The dashboard “Future API Readiness” card shows whether keys for OpenAI, Google Maps, Push, etc. are connected — without ever revealing the keys themselves.' },
    { title: '17. Analytics', body: 'A simple view counter and analytics card live on the dashboard. They can be hidden or disabled in Settings.' },
    { title: '18. Backup', body: 'Use the Account page for export/backup utilities and to rotate the seeded builder password.', hint: SAFETY_HINT },
  ],
};

const SITE_ADMIN_TOUR: DemoTour = {
  id: 'admin',
  title: 'Site Admin Tour',
  audience: 'Site Admin',
  intro: 'Everything a Site Admin can manage — content, products, branding, and public-facing settings.',
  steps: [
    { title: '1. Dashboard Basics', body: 'You get the same overview cards as the Builder, minus team management and system internals.' },
    { title: '2. Products', body: 'Add, edit, hide, or sell-out menu items. Smart Description and image upload work the same as for the Builder.' },
    { title: '3. Merch', body: 'Manage merchandise items the same way as products.' },
    { title: '4. Branding', body: 'Update the logo, colors, hero text, and homepage style from the Branding page.' },
    { title: '5. Payments', body: 'Toggle which payment methods appear at checkout and edit the instructions customers see.' },
    { title: '6. Pickup & Delivery', body: 'Enable pickup, delivery, both, or neither. Set the delivery fee and service area.' },
    { title: '7. Public Site Settings', body: 'Hours, contact info, social links, ordering on/off, and other storefront copy live in Settings.' },
    { title: '8. Smart Descriptions', body: 'Generate snappy product blurbs locally. Add an AI key later and the same button gets smarter automatically.' },
    { title: '9. Review Moderation', body: 'Approve or hide reviews and photos before they appear publicly.', hint: SAFETY_HINT },
  ],
};

const SYSTEM_ADMIN_TOUR: DemoTour = {
  id: 'admin',
  title: 'System Admin Tour',
  audience: 'System Admin',
  intro: 'Technical readiness, integrations, and analytics.',
  steps: [
    { title: '1. Health Panel', body: 'The dashboard System Status card reports database, email, SMS, and notification pipeline health.' },
    { title: '2. API Readiness', body: 'The Future API Readiness rows tell you which providers (OpenAI, Google Maps, Push) are configured. Booleans only — never the values.' },
    { title: '3. Notifications', body: 'Adjust notification preferences and unlock sound playback for this browser.' },
    { title: '4. Analytics', body: 'Toggle whether the site collects view counts and whether the dashboard card is visible.' },
    { title: '5. Backup & Export', body: 'Account page houses export utilities. Use them before risky changes.' },
    { title: '6. Push / SMS / Email', body: 'These channels light up automatically when the matching keys exist. Until then the app gracefully falls back to in-browser notifications.' },
    { title: '7. Secrets', body: 'API keys live in Replit Secrets — never in the app UI, never in source. The status panel only shows configured/missing.', hint: SAFETY_HINT },
  ],
};

const CAMPAIGN_TOUR: DemoTour = {
  id: 'admin',
  title: 'Campaigns & Rewards Tour',
  audience: 'Campaign / Rewards Admin',
  intro: 'Run rewards, referrals, and campaign blasts.',
  steps: [
    { title: '1. Rewards Dashboard', body: 'See member counts, points outstanding, lifetime redeemed, and recent activity.' },
    { title: '2. Members', body: 'Look up rewards members by phone, edit contact info, and see point balance + history.' },
    { title: '3. Point Adjustments', body: 'Make manual adjustments (gift, fix mistake, comp). Each adjustment is logged with your name.' },
    { title: '4. Referral Campaigns', body: 'Set referrer / referee bonus points and decide when they unlock (signup vs. first completed order).' },
    { title: '5. Birthday Rewards', body: 'Customers who add a birthday in their rewards profile can receive an automatic offer that month.' },
    { title: '6. Holiday Campaigns', body: 'Run themed blasts. Drafts are stored locally; sending live needs a connected channel.' },
    { title: '7. Promo Campaigns', body: 'Spin up timed promos. Stacking with rewards is controlled in Settings.' },
    { title: '8. Customer Signup Flow', body: 'On the public Rewards page, customers can switch between Check My Rewards and Join Rewards. Joining only needs name + phone.' },
    { title: '9. Apply at Checkout', body: 'Eligible customers see an Apply Rewards panel in the cart. Selecting a tier discounts the order; points are reserved until completion.' },
    { title: '10. Referral Links', body: 'Each member has a referral code. Sharing produces a URL like /?ref=CODE that prefills the Join form for friends.', hint: SAFETY_HINT },
  ],
};

const STAFF_TOUR: DemoTour = {
  id: 'admin',
  title: 'Staff Tour',
  audience: 'Staff',
  intro: 'Day-to-day order and message handling.',
  steps: [
    { title: '1. Orders', body: 'Open Orders to see every customer request sorted by newest. Filter by status to focus on what needs work.' },
    { title: '2. Order Statuses', body: 'Move orders forward: new → confirmed → ready → picked up / completed. Cancelling releases any pending rewards.' },
    { title: '3. Messages', body: 'Customer messages from the Contact page show up in Messages. Reply, mark read, or archive.' },
    { title: '4. Notifications', body: 'The bell shows new activity. Click the unlock banner once to allow sound alerts in this browser.' },
    { title: '5. Limits', body: 'Staff cannot edit settings, branding, payments, or team. Ask a Builder or Site Admin if changes are needed.', hint: SAFETY_HINT },
  ],
};

const DELIVERY_TOUR: DemoTour = {
  id: 'delivery',
  title: 'Delivery Driver Tour',
  audience: 'Delivery Driver',
  intro: 'Everything you need on the road.',
  steps: [
    { title: '1. Deliveries Page', body: 'Open Deliveries to see only the orders that need delivery. Filters: Active, Out for Delivery, Delivered, All.' },
    { title: '2. Address & Customer', body: 'Each card shows the delivery address, the customer name, phone (tap to call), and time requested.' },
    { title: '3. Directions', body: 'Tap “Open Directions” to launch Google Maps with the route prefilled. Works without a Google API key.' },
    { title: '4. Mark Out for Delivery', body: 'When you grab the order, tap Mark Out for Delivery so the kitchen knows it’s on the road.' },
    { title: '5. Mark Delivered', body: 'Once the customer has it, tap Mark Delivered. This also finalizes any reward points the customer earned.' },
    { title: '6. Report Issue', body: 'If you cannot deliver, tap Report Issue. The order is marked cancelled and any pending reward is released without deduction.' },
    { title: '7. Driver Notes', body: 'Add gate codes, parking notes, or where you left the order. Notes save to the order so the team can see them.' },
    { title: '8. Boundaries', body: 'Drivers cannot see settings, payments, or team management — only what is needed to deliver safely.', hint: SAFETY_HINT },
  ],
};

const VIEWER_TOUR: DemoTour = {
  id: 'admin',
  title: 'Viewer Tour',
  audience: 'Viewer',
  intro: 'Read-only access to keep an eye on the business.',
  steps: [
    { title: '1. Dashboard', body: 'See the same headline numbers as everyone else: active orders, requests, products, revenue.' },
    { title: '2. Products (Read-only)', body: 'Browse the menu in admin view, but Save and Add buttons are hidden.' },
    { title: '3. Orders (Read-only)', body: 'Inspect order details and statuses without changing anything.' },
    { title: '4. Rewards & Campaigns', body: 'If enabled for your account, you can review reward activity and campaign drafts.' },
    { title: '5. Analytics', body: 'View counts and analytics show up if Settings allow.' },
    { title: '6. Limits', body: 'Edit, delete, send, and team controls stay hidden. Ask the Builder for any changes.', hint: SAFETY_HINT },
  ],
};

const CUSTOMER_TOUR: DemoTour = {
  id: 'customer',
  title: 'How Candy CrackZZZ Works',
  audience: 'Customer',
  intro: 'A quick taste of the customer experience — ordering, rewards, and reviews.',
  steps: [
    { title: '1. Browse the Menu', body: 'Tap MENU to see every flavor. Use the search bar or category chips to narrow it down.' },
    { title: '2. Add to Cart', body: 'On any item, choose quantity and any custom notes (event, theme, special instructions) and tap Add to Cart.' },
    { title: '3. Order Helper', body: 'Stuck? Tap the HELPER button on any page for quick suggestions and answers.' },
    { title: '4. Join Rewards', body: 'Open REWARDS, switch to the Join tab, and sign up with a name + phone. Email and birthday are optional.' },
    { title: '5. Check Rewards', body: 'On the Check My Rewards tab, enter your phone to see your point balance and history.' },
    { title: '6. Share Referral Link', body: 'Inside your rewards profile, tap Share to send your link. Friends who use it can earn you bonus points.' },
    { title: '7. Apply Rewards at Checkout', body: 'In the cart, if you have enough points, an Apply Rewards panel lets you redeem them for a discount on this order.' },
    { title: '8. Leave a Review with a Photo', body: 'After your order, head to CONTACT to leave a review. You can attach a photo (up to 2.5 MB) and it will show on the home page once approved.' },
    { title: '9. Pickup or Delivery', body: 'Pick your preferred method at checkout. Delivery shows the delivery fee; pickup shows the address and hours.', hint: SAFETY_HINT },
  ],
};

const REWARDS_TOUR: DemoTour = {
  id: 'rewards',
  title: 'Rewards in 60 Seconds',
  audience: 'Customer',
  intro: 'How points, referrals, and redemptions work.',
  steps: [
    { title: '1. Join with Your Phone', body: 'Your phone number is your account. Optional fields (email, birthday, referral code) personalize your perks.' },
    { title: '2. Earn on Every Order', body: 'You earn points per dollar spent — plus bonus tiers like double-points days, first-order bonus, and birthday boosts.' },
    { title: '3. Use a Referral Link', body: 'Got a friend’s link? It auto-fills the Join form. When you complete your first order, you both earn referral bonus points.' },
    { title: '4. Redeem at Checkout', body: 'When you have enough points, the Apply Rewards panel in your cart shows your eligible tiers (e.g. 100 pts = $5 off).' },
    { title: '5. Pending Until Completed', body: 'Redemptions are reserved when you place the order. Once the order is marked completed, points are deducted; if cancelled, the reward is released.', hint: SAFETY_HINT },
  ],
};

const CHECKOUT_TOUR: DemoTour = {
  id: 'checkout',
  title: 'Checkout Walkthrough',
  audience: 'Customer',
  intro: 'A quick tour of the cart and how rewards apply.',
  steps: [
    { title: '1. Review Items', body: 'Your cart shows each item with quantity, notes, and price. Remove an item with the trash icon.' },
    { title: '2. Contact Info', body: 'Enter name and phone (required). Email is optional. Your phone is also how rewards link up.' },
    { title: '3. Rewards Opt-in', body: 'Check the rewards box to track points for this order. New phone numbers create a profile; existing ones add to it.' },
    { title: '4. Apply Rewards', body: 'If your account has enough points and the cart total is high enough, tap a tier in Apply Rewards to take the discount.' },
    { title: '5. Pickup or Delivery', body: 'Choose your method. Delivery requires an address; both show available time slots.' },
    { title: '6. Payment', body: 'Pick a payment method enabled by the shop (cash at pickup, Stripe, PayPal, Venmo, etc.). Final total updates with any reward discount.' },
    { title: '7. Submit', body: 'Submitting saves your order in the admin queue. You’ll see a confirmation page next.', hint: SAFETY_HINT },
  ],
};

export function tourForAdminRole(role: AdminRole | undefined | null): DemoTour {
  switch (role) {
    case 'site_admin':
      return SITE_ADMIN_TOUR;
    case 'system_admin':
      return SYSTEM_ADMIN_TOUR;
    case 'campaign_admin':
      return CAMPAIGN_TOUR;
    case 'staff':
    case 'employee':
      return STAFF_TOUR;
    case 'delivery_driver':
      return DELIVERY_TOUR;
    case 'viewer':
      return VIEWER_TOUR;
    case 'owner':
    default:
      return BUILDER_TOUR;
  }
}

export const customerTour = CUSTOMER_TOUR;
export const rewardsTour = REWARDS_TOUR;
export const checkoutTour = CHECKOUT_TOUR;

export function tourById(id: 'customer' | 'rewards' | 'checkout'): DemoTour {
  if (id === 'rewards') return REWARDS_TOUR;
  if (id === 'checkout') return CHECKOUT_TOUR;
  return CUSTOMER_TOUR;
}
