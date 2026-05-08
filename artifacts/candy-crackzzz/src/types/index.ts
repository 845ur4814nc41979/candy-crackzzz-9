export type ProductCategory = 'candy-grapes' | 'candy-pineapple' | 'party-trays' | 'seasonal' | 'custom' | 'donutzzz' | 'dirty-sodazzz';
export type OrderStatus = 'new' | 'pending' | 'confirmed' | 'ready' | 'picked-up' | 'completed' | 'cancelled';

// ─── Inventory ────────────────────────────────────────────────────────────────

export type InventoryUnit =
  | 'each' | 'oz' | 'lb' | 'gram' | 'gallon'
  | 'bottle' | 'case' | 'box' | 'sleeve' | 'pack'
  | 'bag' | 'roll' | 'other';

export type InventoryCategory =
  | 'ingredients' | 'candy-coating' | 'fruit' | 'toppings'
  | 'drinks-soda' | 'donutzzz' | 'containers' | 'cups' | 'lids'
  | 'bags' | 'labels' | 'utensils' | 'cleaning-prep' | 'misc';

export type InventoryDeductionTiming = 'on_order' | 'on_completion' | 'manual';

export interface InventoryUsageItem {
  inventoryItemId: string;
  quantityUsed: number;
  unit: InventoryUnit;
  note?: string;
  required: boolean;
  deductTiming: InventoryDeductionTiming;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  unit: InventoryUnit;
  currentQty: number;
  lowStockThreshold: number;
  reorderQty: number;
  supplier?: string;
  supplierLink?: string;
  costPerUnit?: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type InventoryTransactionType =
  | 'order_deduction' | 'manual_adjustment' | 'restock'
  | 'waste' | 'correction' | 'return';

export interface InventoryTransaction {
  id: string;
  inventoryItemId: string;
  orderId?: string;
  productId?: string;
  transactionType: InventoryTransactionType;
  quantityChange: number;
  previousQty: number;
  newQty: number;
  reason?: string;
  createdAt: string;
  createdBy?: string;
}

export type InventoryDeductionStatus =
  | 'not_deducted' | 'deducted' | 'partial' | 'failed' | 'reversed' | 'no_recipe';

// ─────────────────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: ProductCategory;
  description: string;
  shortDescription: string;
  price: number | null;
  imageUrl: string;
  flavorNotes: string;
  colorThemeNotes: string;
  isAvailable: boolean;
  isFeatured: boolean;
  isSeasonal: boolean;
  isCustomEligible: boolean;
  isSoldOut: boolean;
  isVisible: boolean;
  createdAt: string;
  inventoryUsage?: InventoryUsageItem[];
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number | null;
  quantity: number;
  imageUrl: string;
  specialInstructions?: string;
  eventType?: string;
  colorThemeNotes?: string;
  itemType?: 'candy' | 'merch';
  selectedSize?: string;
  selectedColor?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number | null;
  itemType?: 'candy' | 'merch';
  selectedSize?: string;
  selectedColor?: string;
}

export interface OrderRequest {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  items: OrderItem[];
  requestedDate: string;
  requestedTime: string;
  pickupOrDelivery: 'pickup' | 'delivery';
  deliveryAddress?: string;
  notes: string;
  specialInstructions: string;
  eventType: string;
  status: OrderStatus;
  paymentStatus: string;
  paymentMethod?: string;
  rewardsOptIn?: boolean;
  smsMarketingOptIn?: boolean;
  referralCodeUsed?: string;
  rewardsPointsAwarded?: number;
  rewardsAwardedAt?: string;
  referralReferrerPointsAwarded?: number;
  referralReferredCustomerPointsAwarded?: number;
  referralAwardedAt?: string;
  /** Phone-keyed reward profile id captured at checkout, if any. */
  rewardsProfileId?: string;
  /** Points the customer requested to redeem at checkout. */
  rewardsRedeemedPoints?: number;
  /** Dollar discount applied from redeemed points. */
  rewardsDiscountAmount?: number;
  /** Lifecycle of the redemption: pending until completion, then applied or cancelled. */
  rewardsRedemptionStatus?: 'pending' | 'applied' | 'cancelled';
  /** When the customer attached the redemption at checkout. */
  rewardsAppliedAt?: string;
  /** When the redemption was finalized (points actually deducted on completion). */
  rewardsRedeemedAt?: string;
  /** Staff referral code that was active when this order was placed (from staffRef URL param). */
  employeeReferralCodeUsed?: string;
  /** Cash bonus amount owed to the staff member who referred this customer. */
  employeeReferralBonusAmount?: number;
  /** Lifecycle of the staff bonus: none | ineligible | pending | approved | paid | cancelled. */
  employeeReferralBonusStatus?: 'none' | 'ineligible' | 'pending' | 'approved' | 'paid' | 'cancelled';
  /** Human-readable explanation of how the bonus was calculated. */
  employeeReferralBonusNote?: string;
  /** ISO timestamp of when the bonus was first calculated (guards against double-calculation). */
  employeeReferralBonusCalculatedAt?: string;
  total: number;
  createdAt: string;
  inventoryDeductionStatus?: InventoryDeductionStatus;
  inventoryDeductedAt?: string;
}

export interface SocialLinks {
  instagram: string;
  facebook: string;
  tiktok: string;
}

export interface Review {
  id: string;
  customerName: string;
  rating: number;
  text: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'hidden';
  isFeatured: boolean;
  imageBase64?: string;
}

export interface AdminAccount {
  username: string;
  passwordHash: string;
}

export type AdminRole =
  | 'owner'
  | 'site_admin'
  | 'system_admin'
  | 'campaign_admin'
  | 'staff'
  | 'delivery_driver'
  | 'viewer'
  | 'employee';
export type AdminUserStatus = 'active' | 'disabled';
export type AdminActivityStatus = 'active' | 'logged_out' | 'forced_logout';

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  role: AdminRole;
  status: AdminUserStatus;
  createdAt: string;
  mustChangePassword?: boolean;
  lastLoginAt?: string;
}

export interface AdminSession {
  userId: string;
  activityId?: string;
  startedAt?: string;
}

export interface AdminActivityEntry {
  id: string;
  userId: string;
  username: string;
  role: AdminRole;
  loginAt: string;
  logoutAt?: string;
  durationMs?: number;
  status: AdminActivityStatus;
}

export type RewardsEntryType = 'earned' | 'redeemed' | 'adjusted' | 'bonus';

export interface RewardsHistoryEntry {
  id: string;
  type: RewardsEntryType;
  points: number;
  orderId?: string;
  note?: string;
  createdAt: string;
}

export interface RewardProfile {
  id: string;
  customerName: string;
  phone: string;
  email?: string;
  birthdayMonth?: string;
  birthdayDay?: string;
  emailOptIn?: boolean;
  smsOptIn?: boolean;
  tags?: string[];
  currentPoints: number;
  lifetimePointsEarned: number;
  lifetimePointsRedeemed: number;
  totalOrders: number;
  lifetimeSpend?: number;
  lastOrderDate?: string;
  smsMarketingOptIn: boolean;
  referralCode?: string;
  referredByCode?: string;
  successfulReferralCount?: number;
  lifetimeReferralPointsEarned?: number;
  /** Staff referral code that was captured when this customer joined rewards. Internal field — never shown to customers. */
  referredByStaffCode?: string;
  /** Signup bonus owed to the staff member who referred this customer when they joined rewards. */
  staffSignupBonusStatus?: 'none' | 'pending' | 'approved' | 'paid' | 'cancelled' | 'ineligible';
  staffSignupBonusAmount?: number;
  staffSignupBonusCalculatedAt?: string;
  staffSignupBonusNote?: string;
  /** Admin-managed account status. Defaults to active if not set. */
  status?: 'active' | 'inactive' | 'flagged';
  /** Internal admin notes about this customer. Never shown to the customer. */
  adminNotes?: string;
  rewardsHistory: RewardsHistoryEntry[];
}

// ----------- Standalone Staff Referral Codes -----------

export type StaffReferralCodeType = 'staff' | 'promoter' | 'event' | 'booth' | 'influencer' | 'flyer' | 'facebook-ad' | 'manual';
export type StaffReferralCodeStatus = 'active' | 'inactive' | 'paused';

export interface StaffReferralCode {
  id: string;
  /** The short code customers enter at checkout, e.g. "STAFF-MARY", "CCZ-SUMMER". */
  code: string;
  /** Person or campaign name shown in admin, e.g. "Mary Smith", "Summer Booth 2025". */
  name: string;
  type: StaffReferralCodeType;
  status: StaffReferralCodeStatus;
  /** Internal notes — not shown to customers. */
  notes?: string;
  /** When true, orders using this code are flagged for payout tracking in Orderzzz. */
  trackPayout: boolean;
  createdAt: string;
  updatedAt?: string;
}

// ─── Reward Transactions ──────────────────────────────────────────────────────

export type RewardTransactionType =
  | 'earned' | 'redeemed' | 'adjusted'
  | 'referral-bonus' | 'birthday-bonus'
  | 'first-order-bonus' | 'spend-threshold-bonus';

export interface RewardTransaction {
  id: string;
  profileId: string;
  profilePhone: string;
  profileName?: string;
  type: RewardTransactionType;
  points: number;
  orderId?: string;
  note?: string;
  createdAt: string;
  createdBy?: string;
}

// ─── Referral Codes ───────────────────────────────────────────────────────────

export interface ReferralCode {
  id: string;
  code: string;
  ownerProfileId: string;
  ownerPhone: string;
  ownerName: string;
  isActive: boolean;
  createdAt: string;
}

// ─── Referral Events ──────────────────────────────────────────────────────────

export type ReferralEventStatus = 'pending' | 'approved' | 'completed' | 'rejected' | 'flagged';

export interface ReferralEvent {
  id: string;
  referralCode: string;
  referrerProfileId: string;
  referrerPhone: string;
  referrerName: string;
  referredPhone: string;
  referredName: string;
  orderId: string;
  status: ReferralEventStatus;
  referrerBonusPoints: number;
  referredBonusPoints: number;
  bonusAwardedAt?: string;
  isSelfReferral?: boolean;
  createdAt: string;
  updatedAt?: string;
  adminNotes?: string;
}

// ─── Staff Referral Credits ───────────────────────────────────────────────────

export type StaffReferralCreditStatus = 'pending' | 'credited' | 'paid' | 'rejected';

export interface StaffReferralCredit {
  id: string;
  staffCodeId?: string;
  staffCode: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  orderValue: number;
  commissionAmount: number;
  status: StaffReferralCreditStatus;
  paidAt?: string;
  createdAt: string;
  updatedAt?: string;
  adminNotes?: string;
  bonusNote?: string;
}

// ----------- Merch -----------

export type MerchStatus = 'available' | 'coming-soon' | 'out-of-stock' | 'limited';
export type MerchCategory = 'apparel' | 'accessories' | 'drinkware' | 'stickers' | 'home' | 'vendor' | 'other';

export interface MerchItem {
  id: string;
  name: string;
  description: string;
  category: MerchCategory;
  price: number | null;
  salePrice: number | null;
  imageUrl: string;
  status: MerchStatus;
  inventory: number;
  showInventory: boolean;
  isFeatured: boolean;
  isActive: boolean;
  allowPoints: boolean;
  allowFullPointsPurchase: boolean;
  pointsRequired: number;
  maxPointsAllowed: number;
  minPointsToRedeem: number;
  sizes: string[];
  colors: string[];
  pickupShippingNote: string;
  sortOrder: number;
  createdAt: string;
}

// ----------- Rewards Campaigns -----------

export type CampaignType = 'birthday' | 'holiday' | 'manual' | 'milestone' | 'winback' | 'multiplier';
export type RewardType = 'dollar-off' | 'percent-off' | 'free-item' | 'bonus-points' | 'points-multiplier' | 'free-merch';
export type CampaignSendMethod = 'in-app' | 'email' | 'sms' | 'qr-code';

export interface RewardsCampaign {
  id: string;
  name: string;
  type: CampaignType;
  rewardType: RewardType;
  rewardValue: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  expirationDays: number;
  usageLimit: number;
  onePerCustomer: boolean;
  minimumOrderAmount: number;
  appliesTo: 'all' | 'candy' | 'merch';
  targetGroups: string[];
  messageTemplate: string;
  holidayName?: string;
  birthdayWindowDaysBefore?: number;
  birthdayWindowDaysAfter?: number;
  milestoneOrders?: number;
  milestoneSpend?: number;
  winbackDays?: number;
  multiplierValue?: number;
  sendMethods: CampaignSendMethod[];
  showOnHomepage: boolean;
  showAtCheckout: boolean;
  showInWallet: boolean;
  createdAt: string;
}

// ----------- Settings -----------

export interface Settings {
  businessName: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  orderDestinationEmail: string;
  orderNotificationPhone: string;
  contactDestinationEmail: string;
  serviceArea: string;
  aboutText: string;
  socialLinks: SocialLinks;
  enableOrdering: boolean;
  enableCustomOrders: boolean;
  enableSeasonalSection: boolean;
  enableGallery: boolean;
  enableFeaturedSection: boolean;
  enableMerch: boolean;
  enableDonutzzz: boolean;
  showDonutzzzOnHome: boolean;
  showDonutzzzInMenu: boolean;
  enableDirtySodazzz: boolean;
  showDirtySodazzzOnHome: boolean;
  showDirtySodazzzInMenu: boolean;
  enablePickup: boolean;
  enableDelivery: boolean;
  directionsEnabled: boolean;
  deliveryDirectionsButtonEnabled: boolean;
  deliveryDirectionsNote: string;
  deliveryFeeEnabled: boolean;
  deliveryFeeAmount: number;
  minimumOrder: number;
  showPricesPublicly: boolean;
  showSoldOutItems: boolean;
  allowRequestWithoutPrice: boolean;
  enableRewards: boolean;
  rewardsPointsPerDollar: number;
  rewardsAwardOnCompletedOrder: boolean;
  rewardsAllowPromoStacking: boolean;
  rewardsTier1Points: number;
  rewardsTier1Discount: number;
  rewardsTier2Points: number;
  rewardsTier2Discount: number;
  rewardsTier3Points: number;
  rewardsTier3Discount: number;
  rewardsDoublePointsEnabled: boolean;
  rewardsFirstOrderBonusEnabled: boolean;
  rewardsFirstOrderBonusPoints: number;
  rewardsBirthdayBonusEnabled: boolean;
  rewardsBirthdayBonusPoints: number;
  rewardsSpendThresholdEnabled: boolean;
  rewardsSpendThresholdAmount: number;
  rewardsSpendThresholdBonusPoints: number;
  enableReferrals: boolean;
  referralReferrerBonusPoints: number;
  referralReferredCustomerBonusPoints: number;
  referralBonusOnFirstCompletedOrder: boolean;
  referralProgramDescription: string;
  enablePromoTexts: boolean;
  promoTextsDescription: string;
  enablePayments: boolean;
  enableSquare: boolean;
  squarePaymentLink: string;
  squareInstructions: string;
  enableStripe: boolean;
  stripePaymentLink: string;
  stripeInstructions: string;
  enablePayPal: boolean;
  paypalContact: string;
  paypalInstructions: string;
  enableCashApp: boolean;
  cashAppTag: string;
  cashAppInstructions: string;
  enableVenmo: boolean;
  venmoUsername: string;
  venmoInstructions: string;
  enableZelle: boolean;
  zelleContact: string;
  zelleInstructions: string;
  enableQRCode: boolean;
  qrCodeImageBase64: string;
  qrCodeInstructions: string;
  enableManualInvoice: boolean;
  manualInvoiceInstructions: string;
  enableCashAtPickup: boolean;
  cashAtPickupInstructions: string;
  allowDepositOnly: boolean;
  allowFullPayment: boolean;
  allowCashAtPickup: boolean;
  allowManualInvoice: boolean;
  paymentInstructions: string;
  logoBase64: string;
  showLogo: boolean;
  helperEnabled: boolean;
  helperShowFloating: boolean;
  helperShowOnHome: boolean;
  helperShowOnMenu: boolean;
  helperShowOnMerch: boolean;
  helperShowOnCart: boolean;
  helperAllowMerchSuggestions: boolean;
  helperAllowRewardsSuggestions: boolean;
  helperAllowReferralSuggestions: boolean;
  helperAllowCustomOrderIdeas: boolean;
  helperGreeting: string;
  helperMaxRecommendations: number;
  helperAllergyDisclaimer: string;
  helperFallbackMessage: string;
  notificationSoundsEnabled: boolean;
  notificationSoundVolume: number;
  orderSoundEnabled: boolean;
  messageSoundEnabled: boolean;
  generalSoundEnabled: boolean;
  notificationPollingEnabled: boolean;
  notificationPollingSeconds: number;
  notificationBellEnabled: boolean;
  analyticsEnabled: boolean;
  analyticsExcludeAdminRoutes: boolean;
  analyticsRetentionLimit: number;
  analyticsShowDashboardCard: boolean;
  enableInventoryTracking: boolean;
  inventoryDeductTiming: 'on_order' | 'on_completion' | 'manual';
  inventoryAllowNegative: boolean;
  inventoryShowLowStockAlerts: boolean;
  inventoryDefaultLowStockThreshold: number;
  rewardsMinPointsToRedeem: number;
  rewardsMaxPointsPerOrder: number;
  rewardsAllowOnMerch: boolean;
  rewardsAllowOnCandy: boolean;
  referralMinOrderAmount: number;
  referralAllowStacking: boolean;
  enableStaffReferralCodes: boolean;
  staffReferralTrackPayout: boolean;
  staffReferralTrackOrderCount: boolean;
  staffReferralTrackSalesVolume: boolean;
}
