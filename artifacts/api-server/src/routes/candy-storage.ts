import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { db, ccStateTable, ccMessagesTable, ccNotificationsTable, ccAnalyticsViewsTable } from "@workspace/db";
import { eq, desc, sql, lt, gte, count } from "drizzle-orm";

export type AdminRole =
  | "owner"
  | "site_admin"
  | "system_admin"
  | "campaign_admin"
  | "staff"
  | "delivery_driver"
  | "viewer"
  | "employee";
export type AdminUserStatus = "active" | "disabled";
export type AdminActivityStatus = "active" | "logged_out" | "forced_logout";

export const ADMIN_ROLES: AdminRole[] = [
  "owner",
  "site_admin",
  "system_admin",
  "campaign_admin",
  "staff",
  "delivery_driver",
  "viewer",
];

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

export type AdminPermission =
  | "manageAdmins"
  | "manageSiteSettings"
  | "manageSystemSettings"
  | "manageProducts"
  | "viewProducts"
  | "manageMerch"
  | "viewMerch"
  | "manageOrders"
  | "viewOrders"
  | "manageMessages"
  | "viewMessages"
  | "manageRewards"
  | "viewRewards"
  | "manageCampaigns"
  | "viewCampaigns"
  | "managePayments"
  | "manageBranding"
  | "viewAnalytics"
  | "manageAnalytics"
  | "manageNotifications"
  | "managePushNotifications"
  | "manageBackups"
  | "viewOnly";

const ROLE_PERMISSIONS_SERVER: Record<Exclude<AdminRole, "employee">, AdminPermission[]> = {
  owner: [
    "manageAdmins",
    "manageSiteSettings",
    "manageSystemSettings",
    "manageProducts", "viewProducts",
    "manageMerch", "viewMerch",
    "manageOrders", "viewOrders",
    "manageMessages", "viewMessages",
    "manageRewards", "viewRewards",
    "manageCampaigns", "viewCampaigns",
    "managePayments",
    "manageBranding",
    "viewAnalytics", "manageAnalytics",
    "manageNotifications",
    "managePushNotifications",
    "manageBackups",
  ],
  site_admin: [
    "manageSiteSettings",
    "manageProducts", "viewProducts",
    "manageMerch", "viewMerch",
    "manageOrders", "viewOrders",
    "manageMessages", "viewMessages",
    "manageRewards", "viewRewards",
    "manageCampaigns", "viewCampaigns",
    "managePayments",
    "manageBranding",
    "viewAnalytics",
    "manageNotifications",
  ],
  system_admin: [
    "manageSystemSettings",
    "manageNotifications",
    "managePushNotifications",
    "viewAnalytics", "manageAnalytics",
    "manageBackups",
  ],
  campaign_admin: [
    "manageCampaigns", "viewCampaigns",
    "manageRewards", "viewRewards",
    "viewMessages",
    "viewOrders",
    "viewAnalytics",
  ],
  staff: [
    "manageOrders", "viewOrders",
    "manageMessages", "viewMessages",
  ],
  delivery_driver: [
    "manageOrders", "viewOrders",
  ],
  viewer: [
    "viewProducts",
    "viewMerch",
    "viewOrders",
    "viewMessages",
    "viewCampaigns",
    "viewRewards",
    "viewAnalytics",
    "viewOnly",
  ],
};

export function normalizeAdminRole(role: AdminRole): Exclude<AdminRole, "employee"> {
  return role === "employee" ? "staff" : role;
}

export function roleHasServerPermission(role: AdminRole, permission: AdminPermission): boolean {
  const effective = normalizeAdminRole(role);
  return ROLE_PERMISSIONS_SERVER[effective]?.includes(permission) ?? false;
}

export function userHasServerPermission(user: AdminUser | null, permission: AdminPermission): boolean {
  if (!user) return false;
  if (user.status !== "active") return false;
  return roleHasServerPermission(user.role, permission);
}

export function isOwnerRole(role: AdminRole): boolean {
  return role === "owner";
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

export interface SessionRecord {
  userId: string;
  activityId?: string;
  startedAt?: string;
}

export type StateKey = "products" | "orders" | "settings" | "reviews" | "rewardProfiles" | "merch" | "campaigns" | "inventory" | "inventoryTransactions" | "staffReferralCodes";

export interface PersistedState {
  products: unknown[];
  orders: unknown[];
  settings: Record<string, unknown>;
  reviews: unknown[];
  rewardProfiles: unknown[];
  merch: unknown[];
  campaigns: unknown[];
  inventory: unknown[];
  inventoryTransactions: unknown[];
  staffReferralCodes: unknown[];
}

export interface AuthState {
  users: AdminUser[];
  activityLogs: AdminActivityEntry[];
  sessions: Record<string, SessionRecord>;
}

export interface PersistedDb {
  version: 1;
  state: PersistedState;
  auth: AuthState;
}

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

export const STATE_KEYS: StateKey[] = ["products", "orders", "settings", "reviews", "rewardProfiles", "merch", "campaigns", "inventory", "inventoryTransactions", "staffReferralCodes"];
export const OWNER_ONLY_STATE_KEYS = new Set<StateKey>(["products", "settings", "reviews", "merch", "campaigns", "inventory", "inventoryTransactions", "staffReferralCodes"]);

export const DEFAULT_OWNER_USERNAME = normalizeUsername(
  process.env["ADMIN_USERNAME"] ?? process.env["CANDY_CRACKZZZ_DEFAULT_ADMIN_USERNAME"] ?? "owner",
);
export const DEFAULT_OWNER_PASSWORD =
  process.env["ADMIN_PASSWORD"] ?? process.env["CANDY_CRACKZZZ_DEFAULT_ADMIN_PASSWORD"] ?? "CandyCrackzzzTemp1!";

const SESSION_SECRET = process.env["SESSION_SECRET"] ?? "candy-crackzzz-dev-session-secret-change-me";

const FORCE_FILE_STORAGE = process.env["CANDY_FORCE_FILE_STORAGE"] === "1";
const HAS_DATABASE = !!process.env["DATABASE_URL"] && !FORCE_FILE_STORAGE;

const DATA_FILE_PATH =
  process.env["CANDY_DATA_FILE"] ?? path.resolve(process.cwd(), ".data", "candy-crackzzz-db.json");

export const defaultSettings: Record<string, unknown> = {
  businessName: process.env["BUSINESS_NAME"] ?? "Candy Crackzzz",
  businessPhone: "",
  businessEmail: "",
  orderDestinationEmail: "",
  orderNotificationPhone: "",
  contactDestinationEmail: "",
  serviceArea: "Spring Hill, FL and surrounding areas",
  aboutText:
    "Candy Crackzzz is your ultimate destination for candy-coated fruit and custom treats.",
  socialLinks: { instagram: "", facebook: "", tiktok: "" },
  enableOrdering: true,
  enableCustomOrders: true,
  enableSeasonalSection: true,
  enableGallery: true,
  enableFeaturedSection: true,
  enableMerch: true,
  enableDonutzzz: false,
  showDonutzzzOnHome: false,
  showDonutzzzInMenu: false,
  enableDirtySodazzz: false,
  showDirtySodazzzOnHome: false,
  showDirtySodazzzInMenu: false,
  enablePickup: true,
  enableDelivery: true,
  deliveryFeeEnabled: false,
  deliveryFeeAmount: 10,
  minimumOrder: 20,
  showPricesPublicly: true,
  showSoldOutItems: true,
  allowRequestWithoutPrice: true,
  enableRewards: true,
  rewardsPointsPerDollar: 1,
  rewardsAwardOnCompletedOrder: true,
  rewardsAllowPromoStacking: false,
  rewardsTier1Points: 50,
  rewardsTier1Discount: 5,
  rewardsTier2Points: 100,
  rewardsTier2Discount: 12,
  rewardsTier3Points: 200,
  rewardsTier3Discount: 25,
  rewardsDoublePointsEnabled: false,
  rewardsFirstOrderBonusEnabled: false,
  rewardsFirstOrderBonusPoints: 10,
  rewardsBirthdayBonusEnabled: false,
  rewardsBirthdayBonusPoints: 15,
  rewardsSpendThresholdEnabled: false,
  rewardsSpendThresholdAmount: 50,
  rewardsSpendThresholdBonusPoints: 10,
  enableReferrals: true,
  referralReferrerBonusPoints: 15,
  referralReferredCustomerBonusPoints: 10,
  referralBonusOnFirstCompletedOrder: true,
  referralProgramDescription:
    "Use a friend referral code at checkout so both of you can earn bonus points after the order is completed.",
  enablePromoTexts: false,
  promoTextsDescription: "Customers who opt in can receive upcoming promotion texts later.",
  enablePayments: false,
  enableSquare: false,
  squarePaymentLink: "",
  squareInstructions: "",
  enableStripe: false,
  stripePaymentLink: "",
  stripeInstructions: "",
  enablePayPal: false,
  paypalContact: "",
  paypalInstructions: "",
  enableCashApp: false,
  cashAppTag: "",
  cashAppInstructions: "",
  enableVenmo: false,
  venmoUsername: "",
  venmoInstructions: "",
  enableZelle: false,
  zelleContact: "",
  zelleInstructions: "",
  enableQRCode: false,
  qrCodeImageBase64: "",
  qrCodeInstructions: "",
  enableManualInvoice: false,
  manualInvoiceInstructions: "We will send you an invoice after confirming your order.",
  enableCashAtPickup: false,
  cashAtPickupInstructions: "Pay cash when you pick up your order.",
  allowDepositOnly: false,
  allowFullPayment: true,
  allowCashAtPickup: false,
  allowManualInvoice: false,
  paymentInstructions: "",
  logoBase64: "",
  showLogo: true,
  rewardsMinPointsToRedeem: 50,
  rewardsMaxPointsPerOrder: 0,
  rewardsAllowOnMerch: true,
  rewardsAllowOnCandy: true,
  referralMinOrderAmount: 0,
  referralAllowStacking: false,
  enableStaffReferralCodes: true,
  staffReferralTrackPayout: true,
};

export const sampleProducts: unknown[] = [
  { id: "1", name: "Rainbow Candy Grapes", slug: "rainbow-candy-grapes", category: "candy-grapes",
    description: "Fresh grapes coated in a rainbow of candy shells. Each grape bursts with fruity flavor and a satisfying candy crackle.",
    shortDescription: "Our signature rainbow candy-coated grapes.",
    price: 15, imageUrl: "/images/rainbow-grapes.png", flavorNotes: "Mixed fruit flavors", colorThemeNotes: "Rainbow",
    isAvailable: true, isFeatured: true, isSeasonal: false, isCustomEligible: false, isSoldOut: false, isVisible: true, createdAt: new Date().toISOString() },
  { id: "2", name: "Blue Raspberry Grapes", slug: "blue-raspberry-grapes", category: "candy-grapes",
    description: "Electric blue candy coating with a tart raspberry punch.", shortDescription: "Sweet and tart blue raspberry.",
    price: 15, imageUrl: "/images/blue-grapes.png", flavorNotes: "Blue Raspberry", colorThemeNotes: "Blue",
    isAvailable: true, isFeatured: true, isSeasonal: false, isCustomEligible: false, isSoldOut: false, isVisible: true, createdAt: new Date().toISOString() },
  { id: "3", name: "Pink Lemonade Grapes", slug: "pink-lemonade-grapes", category: "candy-grapes",
    description: "Hot pink grapes with a refreshing lemonade zing.", shortDescription: "Sweet and sour pink lemonade.",
    price: 15, imageUrl: "/images/pink-grapes.png", flavorNotes: "Pink Lemonade", colorThemeNotes: "Pink",
    isAvailable: true, isFeatured: false, isSeasonal: false, isCustomEligible: false, isSoldOut: false, isVisible: true, createdAt: new Date().toISOString() },
  { id: "4", name: "Tropical Pineapple Chunks", slug: "tropical-pineapple-chunks", category: "candy-pineapple",
    description: "Juicy pineapple chunks with a vibrant tropical candy shell.", shortDescription: "Sweet candied pineapple.",
    price: 18, imageUrl: "/images/tropical-pineapple.png", flavorNotes: "Tropical Punch", colorThemeNotes: "Yellow/Orange",
    isAvailable: true, isFeatured: true, isSeasonal: false, isCustomEligible: false, isSoldOut: false, isVisible: true, createdAt: new Date().toISOString() },
  { id: "5", name: "Mango Habanero Pineapple", slug: "mango-habanero-pineapple", category: "candy-pineapple",
    description: "Spicy and sweet! Mango flavored candy coating with a kick of habanero.", shortDescription: "Spicy sweet candied pineapple.",
    price: 20, imageUrl: "/images/mango-pineapple.png", flavorNotes: "Mango, Habanero", colorThemeNotes: "Orange/Red",
    isAvailable: true, isFeatured: false, isSeasonal: false, isCustomEligible: false, isSoldOut: false, isVisible: true, createdAt: new Date().toISOString() },
  { id: "6", name: "Rainbow Party Tray (Small)", slug: "rainbow-party-tray-small", category: "party-trays",
    description: "A beautiful arrangement of our best candy-coated fruits perfect for small gatherings.", shortDescription: "Mixed tray for small parties.",
    price: 45, imageUrl: "/images/rainbow-tray.png", flavorNotes: "Mixed", colorThemeNotes: "Rainbow",
    isAvailable: true, isFeatured: false, isSeasonal: false, isCustomEligible: false, isSoldOut: false, isVisible: true, createdAt: new Date().toISOString() },
  { id: "7", name: "Deluxe Celebration Tray", slug: "deluxe-celebration-tray", category: "party-trays",
    description: "The ultimate candy fruit experience for large parties and events.", shortDescription: "Large mixed tray for celebrations.",
    price: 85, imageUrl: "/images/deluxe-tray.png", flavorNotes: "Mixed", colorThemeNotes: "Rainbow/Custom",
    isAvailable: true, isFeatured: true, isSeasonal: false, isCustomEligible: true, isSoldOut: false, isVisible: true, createdAt: new Date().toISOString() },
  { id: "8", name: "Valentine's Special Grapes", slug: "valentines-special-grapes", category: "seasonal",
    description: "Romantic red and pink candy-coated grapes, perfect for your sweetheart.", shortDescription: "Seasonal romantic grapes.",
    price: 20, imageUrl: "/images/valentine-grapes.png", flavorNotes: "Cherry, Strawberry", colorThemeNotes: "Red/Pink",
    isAvailable: true, isFeatured: false, isSeasonal: true, isCustomEligible: false, isSoldOut: false, isVisible: true, createdAt: new Date().toISOString() },
  { id: "9", name: "Birthday Bash Custom Tray", slug: "birthday-bash-custom-tray", category: "custom",
    description: "A totally custom tray tailored to your birthday theme and colors.", shortDescription: "Custom tray for birthdays.",
    price: null, imageUrl: "/images/birthday-tray.png", flavorNotes: "Custom", colorThemeNotes: "Custom",
    isAvailable: true, isFeatured: false, isSeasonal: false, isCustomEligible: true, isSoldOut: false, isVisible: true, createdAt: new Date().toISOString() },
  { id: "donut-1", name: "Candy Crunch Mini Donutzzz", slug: "candy-crunch-mini-donutzzz", category: "donutzzz",
    description: "Mini fried donuts drenched in chocolate glaze and loaded with crushed candy, cookies, and rainbow gems.", shortDescription: "Chocolate-glazed mini donuts with candy crunch.",
    price: 12, imageUrl: "/images/stock/candy-crunch-mini-donutzzz.png", flavorNotes: "Chocolate, mixed candy", colorThemeNotes: "Rainbow",
    isAvailable: true, isFeatured: true, isSeasonal: false, isCustomEligible: false, isSoldOut: false, isVisible: true, createdAt: new Date().toISOString() },
  { id: "donut-2", name: "Strawberry Gummy Mini Donutzzz", slug: "strawberry-gummy-mini-donutzzz", category: "donutzzz",
    description: "Pink strawberry-glazed mini donuts with a marshmallow drizzle, white chocolate chips, and crushed gummies.", shortDescription: "Pink-glazed mini donuts with gummies.",
    price: 12, imageUrl: "/images/stock/strawberry-gummy-mini-donutzzz.png", flavorNotes: "Strawberry glaze, gummies", colorThemeNotes: "Pink",
    isAvailable: true, isFeatured: true, isSeasonal: false, isCustomEligible: false, isSoldOut: false, isVisible: true, createdAt: new Date().toISOString() },
  { id: "donut-3", name: "Blue Raspberry Rock Candy Donutzzz", slug: "blue-raspberry-rock-candy-donutzzz", category: "donutzzz",
    description: "Blue raspberry-glazed donuts topped with shattered pink and blue rock candy and a creamy drizzle.", shortDescription: "Blue glazed donuts with rock candy.",
    price: 13, imageUrl: "/images/stock/blue-raspberry-rock-candy-donutzzz.png", flavorNotes: "Blue raspberry, rock candy", colorThemeNotes: "Blue/Pink",
    isAvailable: true, isFeatured: false, isSeasonal: false, isCustomEligible: false, isSoldOut: false, isVisible: true, createdAt: new Date().toISOString() },
  { id: "donut-4", name: "Chocolate Cookie Crunch Donutzzz", slug: "chocolate-cookie-crunch-donutzzz", category: "donutzzz",
    description: "Caramel-chocolate donuts piled with crushed cookies, candy pearls, and a chocolate drizzle.", shortDescription: "Chocolate donuts with cookie crunch.",
    price: 13, imageUrl: "/images/stock/chocolate-cookie-crunch-donutzzz.png", flavorNotes: "Chocolate, caramel, cookies", colorThemeNotes: "Brown/Multi",
    isAvailable: true, isFeatured: false, isSeasonal: false, isCustomEligible: false, isSoldOut: false, isVisible: true, createdAt: new Date().toISOString() },
  { id: "soda-1", name: "Strawberry Cream Dirty Sodazzz", slug: "strawberry-cream-dirty-sodazzz", category: "dirty-sodazzz",
    description: "Lemon-lime soda blended with strawberry puree, half-and-half, and topped with whipped cream and pink candy crumble.", shortDescription: "Creamy pink strawberry dirty soda.",
    price: 7, imageUrl: "/images/stock/strawberry-cream-dirty-sodazzz.png", flavorNotes: "Strawberry, cream, lime", colorThemeNotes: "Pink",
    isAvailable: true, isFeatured: true, isSeasonal: false, isCustomEligible: false, isSoldOut: false, isVisible: true, createdAt: new Date().toISOString() },
  { id: "soda-2", name: "Tropical Lime Pineapple Dirty Sodazzz", slug: "tropical-lime-pineapple-dirty-sodazzz", category: "dirty-sodazzz",
    description: "Lime soda mixed with pineapple puree and coconut cream, garnished with fresh pineapple and lime.", shortDescription: "Tropical lime + pineapple dirty soda.",
    price: 7, imageUrl: "/images/stock/tropical-lime-pineapple-dirty-sodazzz.png", flavorNotes: "Lime, pineapple, coconut cream", colorThemeNotes: "Yellow/Green",
    isAvailable: true, isFeatured: true, isSeasonal: false, isCustomEligible: false, isSoldOut: false, isVisible: true, createdAt: new Date().toISOString() },
  { id: "soda-3", name: "Blue Raspberry Dirty Sodazzz", slug: "blue-raspberry-dirty-sodazzz", category: "dirty-sodazzz",
    description: "Bold blue raspberry soda topped with vanilla cream, fresh raspberries, and a rock candy stick.", shortDescription: "Bold blue raspberry cream soda.",
    price: 7, imageUrl: "/images/stock/blue-raspberry-dirty-sodazzz.png", flavorNotes: "Blue raspberry, vanilla cream", colorThemeNotes: "Blue",
    isAvailable: true, isFeatured: false, isSeasonal: false, isCustomEligible: false, isSoldOut: false, isVisible: true, createdAt: new Date().toISOString() },
  { id: "soda-4", name: "Dirty Dr Pepper Sodazzz", slug: "dirty-dr-pepper-sodazzz", category: "dirty-sodazzz",
    description: "Smooth Dr Pepper over ice swirled with vanilla cream and a splash of cherry. The ultimate dirty soda indulgence.", shortDescription: "Dr Pepper, vanilla cream, cherry.",
    price: 8, imageUrl: "/images/stock/dirty-dr-pepper-sodazzz.png", flavorNotes: "Dr Pepper, vanilla, cherry", colorThemeNotes: "Dark/Red",
    isAvailable: true, isFeatured: false, isSeasonal: false, isCustomEligible: false, isSoldOut: false, isVisible: true, createdAt: new Date().toISOString() },
];

export const sampleMerchItems: unknown[] = [
  { id: "merch-1", name: "Candy Crackzzz Graffiti Tee", description: "Bold candy-drip graffiti logo on a premium black tee. Soft, structured, and made to turn heads.", category: "apparel", price: 30, salePrice: null, imageUrl: "", status: "available", inventory: 50, showInventory: false, isFeatured: true, isActive: true, allowPoints: true, allowFullPointsPurchase: false, pointsRequired: 300, maxPointsAllowed: 150, minPointsToRedeem: 50, sizes: ["S","M","L","XL","2XL","3XL"], colors: ["Black"], pickupShippingNote: "Available for pickup or local delivery.", sortOrder: 1, createdAt: new Date().toISOString() },
  { id: "merch-2", name: "Drip Flame Hoodie", description: "Candy-drip flame sleeves with the CC logo on the chest. Heavyweight fleece, streetwear-ready.", category: "apparel", price: 55, salePrice: null, imageUrl: "", status: "available", inventory: 30, showInventory: false, isFeatured: true, isActive: true, allowPoints: true, allowFullPointsPurchase: false, pointsRequired: 550, maxPointsAllowed: 200, minPointsToRedeem: 100, sizes: ["S","M","L","XL","2XL","3XL"], colors: ["Black"], pickupShippingNote: "Available for pickup or local delivery.", sortOrder: 2, createdAt: new Date().toISOString() },
  { id: "merch-3", name: "CC Drip Trucker Hat", description: "Mesh back, structured front, CC candy-drip logo. One size fits all with an adjustable snapback.", category: "accessories", price: 25, salePrice: null, imageUrl: "", status: "available", inventory: 40, showInventory: false, isFeatured: false, isActive: true, allowPoints: true, allowFullPointsPurchase: true, pointsRequired: 250, maxPointsAllowed: 125, minPointsToRedeem: 50, sizes: ["One Size"], colors: ["Black"], pickupShippingNote: "Available for pickup.", sortOrder: 3, createdAt: new Date().toISOString() },
  { id: "merch-4", name: "Galaxy Rhinestone Tumbler", description: "Insulated 30oz stainless steel tumbler wrapped in a galaxy rhinestone drip design. Keeps drinks cold for hours.", category: "drinkware", price: 45, salePrice: null, imageUrl: "", status: "available", inventory: 20, showInventory: true, isFeatured: true, isActive: true, allowPoints: true, allowFullPointsPurchase: false, pointsRequired: 450, maxPointsAllowed: 200, minPointsToRedeem: 50, sizes: ["30oz"], colors: ["Galaxy Blue/Pink","Black"], pickupShippingNote: "Fragile — pickup recommended.", sortOrder: 4, createdAt: new Date().toISOString() },
  { id: "merch-5", name: "Candy Crackzzz Sticker Pack", description: "5-piece vinyl sticker pack featuring the CC logo, graffiti wordmark, and drip designs. Waterproof and bold.", category: "stickers", price: 8, salePrice: null, imageUrl: "", status: "available", inventory: 100, showInventory: false, isFeatured: false, isActive: true, allowPoints: true, allowFullPointsPurchase: true, pointsRequired: 80, maxPointsAllowed: 80, minPointsToRedeem: 30, sizes: [], colors: [], pickupShippingNote: "Ships easily — available pickup or mail.", sortOrder: 5, createdAt: new Date().toISOString() },
  { id: "merch-6", name: "CC Vendor Apron", description: "Durable black apron with embroidered CC logo. Built for busy vendor days and candy events.", category: "vendor", price: 35, salePrice: null, imageUrl: "", status: "available", inventory: 15, showInventory: false, isFeatured: false, isActive: true, allowPoints: false, allowFullPointsPurchase: false, pointsRequired: 0, maxPointsAllowed: 0, minPointsToRedeem: 0, sizes: ["One Size"], colors: ["Black"], pickupShippingNote: "Available for pickup.", sortOrder: 6, createdAt: new Date().toISOString() },
  { id: "merch-7", name: "CC Canvas Tote Bag", description: "Heavy-duty canvas tote with the Candy Crackzzz graffiti logo. Use it for market days, pickups, and everything in between.", category: "accessories", price: 20, salePrice: null, imageUrl: "", status: "coming-soon", inventory: 0, showInventory: false, isFeatured: false, isActive: true, allowPoints: true, allowFullPointsPurchase: true, pointsRequired: 200, maxPointsAllowed: 100, minPointsToRedeem: 50, sizes: ["One Size"], colors: ["Black"], pickupShippingNote: "Coming soon — check back!", sortOrder: 7, createdAt: new Date().toISOString() },
];

export const sampleCampaigns: unknown[] = [
  { id: "camp-1", name: "Birthday Crack Drop", type: "birthday", rewardType: "bonus-points", rewardValue: 25, isActive: true, expirationDays: 14, usageLimit: 0, onePerCustomer: true, minimumOrderAmount: 0, appliesTo: "all", targetGroups: [], messageTemplate: "Happy Birthday! Here's a sweet reward from Candy Crackzzz. Enjoy {reward} to celebrate your day!", birthdayWindowDaysBefore: 7, birthdayWindowDaysAfter: 7, sendMethods: ["in-app"], showOnHomepage: false, showAtCheckout: false, showInWallet: true, createdAt: new Date().toISOString() },
  { id: "camp-2", name: "First Order Reward", type: "milestone", rewardType: "bonus-points", rewardValue: 15, isActive: true, expirationDays: 30, usageLimit: 1, onePerCustomer: true, minimumOrderAmount: 0, appliesTo: "all", targetGroups: [], messageTemplate: "Welcome to Candy Crackzzz! You earned {reward} bonus points on your first order. Sweet!", milestoneOrders: 1, sendMethods: ["in-app"], showOnHomepage: false, showAtCheckout: false, showInWallet: true, createdAt: new Date().toISOString() },
];

export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function hashPassword(password: string) {
  return crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(`candy-crackzzz:${password}`)
    .digest("hex");
}

function legacyHashPassword(password: string) {
  return crypto.createHash("sha256").update(`candy-crackzzz:${password}`).digest("hex");
}

export function verifyPassword(plain: string, storedHash: string): boolean {
  return storedHash === hashPassword(plain) || storedHash === legacyHashPassword(plain);
}

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function createDefaultOwner(): AdminUser {
  return {
    id: createId("usr"),
    username: DEFAULT_OWNER_USERNAME,
    passwordHash: hashPassword(DEFAULT_OWNER_PASSWORD),
    role: "owner",
    status: "active",
    createdAt: new Date().toISOString(),
    mustChangePassword: !process.env["ADMIN_PASSWORD"],
  };
}

function freshDefaultDb(): PersistedDb {
  return {
    version: 1,
    state: {
      products: sampleProducts,
      orders: [],
      settings: defaultSettings,
      reviews: [],
      rewardProfiles: [],
      merch: sampleMerchItems,
      campaigns: sampleCampaigns,
      inventory: [],
      inventoryTransactions: [],
      staffReferralCodes: [],
    },
    auth: {
      users: [createDefaultOwner()],
      activityLogs: [],
      sessions: {},
    },
  };
}

function mergeWithDefaults(parsed: Partial<PersistedDb>): PersistedDb {
  const defaults = freshDefaultDb();
  // One-time top-up: when an existing install has products but is missing the
  // newer Donutzzz / Dirty Sodazzz sample items, add the missing seed items so
  // the new sections have stock images out of the box. The
  // `seededExtraSampleSections` settings flag prevents re-seeding after an
  // admin intentionally deletes them.
  let topedUpProducts: unknown[] | null = null;
  const parsedProducts = Array.isArray(parsed.state?.products) ? parsed.state!.products : null;
  const parsedSettings =
    (parsed.state?.settings as Record<string, unknown> | undefined) ?? {};
  const alreadySeededExtras = parsedSettings["seededExtraSampleSections"] === true;
  if (parsedProducts && parsedProducts.length > 0 && !alreadySeededExtras) {
    const existingIds = new Set(
      parsedProducts
        .map((p) => (p as { id?: unknown })?.id)
        .filter((id): id is string => typeof id === "string"),
    );
    const additions = (defaults.state.products as Array<{ id: string; category?: string }>).filter(
      (p) =>
        (p.category === "donutzzz" || p.category === "dirty-sodazzz") &&
        !existingIds.has(p.id),
    );
    if (additions.length > 0) {
      topedUpProducts = [...parsedProducts, ...additions];
    }
  }
  return {
    version: 1,
    state: {
      products:
        Array.isArray(parsed.state?.products) && parsed.state!.products.length > 0
          ? (topedUpProducts ?? parsed.state!.products)
          : defaults.state.products,
      orders: Array.isArray(parsed.state?.orders) ? parsed.state!.orders : [],
      settings: {
        ...defaults.state.settings,
        ...((parsed.state?.settings as Record<string, unknown>) ?? {}),
        seededExtraSampleSections: true,
      },
      reviews: Array.isArray(parsed.state?.reviews) ? parsed.state!.reviews : [],
      rewardProfiles: Array.isArray(parsed.state?.rewardProfiles)
        ? parsed.state!.rewardProfiles
        : [],
      merch: Array.isArray(parsed.state?.merch) ? parsed.state!.merch : defaults.state.merch,
      campaigns: Array.isArray(parsed.state?.campaigns) ? parsed.state!.campaigns : defaults.state.campaigns,
      inventory: Array.isArray(parsed.state?.inventory) ? parsed.state!.inventory : [],
      inventoryTransactions: Array.isArray(parsed.state?.inventoryTransactions) ? parsed.state!.inventoryTransactions : [],
      staffReferralCodes: Array.isArray(parsed.state?.staffReferralCodes) ? parsed.state!.staffReferralCodes : [],
    },
    auth: {
      users: Array.isArray(parsed.auth?.users) && parsed.auth!.users.length > 0
        ? parsed.auth!.users
        : defaults.auth.users,
      activityLogs: Array.isArray(parsed.auth?.activityLogs) ? parsed.auth!.activityLogs : [],
      sessions:
        parsed.auth?.sessions && typeof parsed.auth.sessions === "object"
          ? (parsed.auth.sessions as Record<string, SessionRecord>)
          : {},
    },
  };
}

function syncOwnerWithEnv(database: PersistedDb): PersistedDb {
  const envUsername = process.env["ADMIN_USERNAME"];
  const envPassword = process.env["ADMIN_PASSWORD"];
  if (!envUsername && !envPassword) return database;

  const desiredUsername = normalizeUsername(envUsername ?? DEFAULT_OWNER_USERNAME);
  const desiredHash = hashPassword(envPassword ?? DEFAULT_OWNER_PASSWORD);

  let owner = database.auth.users.find((u) => u.role === "owner");
  if (!owner) {
    owner = {
      id: createId("usr"),
      username: desiredUsername,
      passwordHash: desiredHash,
      role: "owner",
      status: "active",
      createdAt: new Date().toISOString(),
      mustChangePassword: false,
    };
    database.auth.users = [owner, ...database.auth.users];
    return database;
  }

  let changed = false;
  if (owner.username !== desiredUsername) {
    owner.username = desiredUsername;
    changed = true;
  }
  if (envPassword && owner.passwordHash !== desiredHash) {
    owner.passwordHash = desiredHash;
    owner.mustChangePassword = false;
    changed = true;
  }
  if (owner.status !== "active") {
    owner.status = "active";
    changed = true;
  }
  if (changed) {
    database.auth.users = database.auth.users.map((u) => (u.id === owner!.id ? { ...owner! } : u));
  }
  return database;
}

// ---------- File-mode storage (dev only) ----------
function ensureFile() {
  fs.mkdirSync(path.dirname(DATA_FILE_PATH), { recursive: true });
  if (!fs.existsSync(DATA_FILE_PATH)) {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(freshDefaultDb(), null, 2), "utf-8");
  }
}

function readFileDb(): PersistedDb {
  ensureFile();
  try {
    const raw = fs.readFileSync(DATA_FILE_PATH, "utf-8");
    return syncOwnerWithEnv(mergeWithDefaults(JSON.parse(raw) as Partial<PersistedDb>));
  } catch {
    const fresh = syncOwnerWithEnv(freshDefaultDb());
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(fresh, null, 2), "utf-8");
    return fresh;
  }
}

function writeFileDb(database: PersistedDb) {
  ensureFile();
  fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(database, null, 2), "utf-8");
}

// ---------- Postgres-mode storage ----------
async function readPgDb(): Promise<PersistedDb> {
  const rows = await db.select().from(ccStateTable);
  const collected: Partial<PersistedDb> = { state: {} as PersistedState, auth: {} as AuthState };
  for (const row of rows) {
    if (row.key === "state") {
      collected.state = row.value as PersistedState;
    } else if (row.key === "auth") {
      collected.auth = row.value as AuthState;
    }
  }
  return syncOwnerWithEnv(mergeWithDefaults(collected));
}

async function writePgDb(database: PersistedDb): Promise<void> {
  await Promise.all([
    db
      .insert(ccStateTable)
      .values({ key: "state", value: database.state as unknown as Record<string, unknown> })
      .onConflictDoUpdate({
        target: ccStateTable.key,
        set: { value: database.state as unknown as Record<string, unknown>, updatedAt: new Date() },
      }),
    db
      .insert(ccStateTable)
      .values({ key: "auth", value: database.auth as unknown as Record<string, unknown> })
      .onConflictDoUpdate({
        target: ccStateTable.key,
        set: { value: database.auth as unknown as Record<string, unknown>, updatedAt: new Date() },
      }),
  ]);
}

// ---------- Cached single instance to avoid race conditions ----------
let cachedDb: PersistedDb | null = null;
let initPromise: Promise<void> | null = null;

async function ensureInitialized(): Promise<void> {
  if (cachedDb) return;
  if (!initPromise) {
    initPromise = (async () => {
      cachedDb = HAS_DATABASE ? await readPgDb() : readFileDb();
      if (HAS_DATABASE) {
        // Persist any defaults/owner sync back so the first row exists
        await writePgDb(cachedDb);
      } else {
        writeFileDb(cachedDb);
      }
    })();
  }
  await initPromise;
}

export async function readDb(): Promise<PersistedDb> {
  await ensureInitialized();
  return cachedDb!;
}

export async function writeDb(database: PersistedDb): Promise<void> {
  cachedDb = database;
  if (HAS_DATABASE) {
    await writePgDb(database);
  } else {
    writeFileDb(database);
  }
}

export function isUsingDatabase(): boolean {
  return HAS_DATABASE;
}

// ---------- Messages ----------
const fileMessages: MessageRecord[] = [];

function rowToMessage(row: typeof ccMessagesTable.$inferSelect): MessageRecord {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? "",
    email: row.email ?? "",
    subject: row.subject ?? "",
    message: row.message,
    type: row.type ?? "contact",
    contactMethod: row.contactMethod ?? "",
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt ? row.readAt.toISOString() : null,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
  };
}

export async function listMessages(includeArchived = false): Promise<MessageRecord[]> {
  if (!HAS_DATABASE) {
    return [...fileMessages]
      .filter((m) => includeArchived || !m.archivedAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const rows = await db.select().from(ccMessagesTable).orderBy(desc(ccMessagesTable.createdAt));
  return rows.map(rowToMessage).filter((m: MessageRecord) => includeArchived || !m.archivedAt);
}

export async function createMessage(input: {
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  type?: string;
  contactMethod?: string;
}): Promise<MessageRecord> {
  if (!HAS_DATABASE) {
    const record: MessageRecord = {
      id: crypto.randomUUID(),
      name: input.name,
      phone: input.phone,
      email: input.email,
      subject: input.subject,
      message: input.message,
      type: input.type ?? "contact",
      contactMethod: input.contactMethod ?? "",
      createdAt: new Date().toISOString(),
      readAt: null,
      archivedAt: null,
    };
    fileMessages.unshift(record);
    return record;
  }
  const [row] = await db
    .insert(ccMessagesTable)
    .values({
      name: input.name,
      phone: input.phone,
      email: input.email,
      subject: input.subject,
      message: input.message,
      type: input.type ?? "contact",
      contactMethod: input.contactMethod ?? "",
    })
    .returning();
  return rowToMessage(row);
}

export async function markMessageRead(id: string, read: boolean): Promise<MessageRecord | null> {
  const now = read ? new Date() : null;
  if (!HAS_DATABASE) {
    const message = fileMessages.find((m) => m.id === id);
    if (!message) return null;
    message.readAt = now ? now.toISOString() : null;
    return message;
  }
  const [row] = await db
    .update(ccMessagesTable)
    .set({ readAt: now })
    .where(eq(ccMessagesTable.id, id))
    .returning();
  return row ? rowToMessage(row) : null;
}

export async function archiveMessage(id: string, archived: boolean): Promise<MessageRecord | null> {
  const now = archived ? new Date() : null;
  if (!HAS_DATABASE) {
    const message = fileMessages.find((m) => m.id === id);
    if (!message) return null;
    message.archivedAt = now ? now.toISOString() : null;
    return message;
  }
  const [row] = await db
    .update(ccMessagesTable)
    .set({ archivedAt: now })
    .where(eq(ccMessagesTable.id, id))
    .returning();
  return row ? rowToMessage(row) : null;
}

export async function deleteMessage(id: string): Promise<boolean> {
  if (!HAS_DATABASE) {
    const idx = fileMessages.findIndex((m) => m.id === id);
    if (idx < 0) return false;
    fileMessages.splice(idx, 1);
    return true;
  }
  const result = await db.delete(ccMessagesTable).where(eq(ccMessagesTable.id, id)).returning();
  return result.length > 0;
}

// ---------- Notifications ----------
const fileNotifications: NotificationRecord[] = [];

function rowToNotification(row: typeof ccNotificationsTable.$inferSelect): NotificationRecord {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body ?? "",
    relatedKind: row.relatedKind ?? "",
    relatedId: row.relatedId ?? "",
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt ? row.readAt.toISOString() : null,
  };
}

export async function listNotifications(limit = 100): Promise<NotificationRecord[]> {
  if (!HAS_DATABASE) {
    return fileNotifications.slice(0, limit);
  }
  const rows = await db
    .select()
    .from(ccNotificationsTable)
    .orderBy(desc(ccNotificationsTable.createdAt))
    .limit(limit);
  return rows.map(rowToNotification);
}

export async function createNotification(input: {
  type: string;
  title: string;
  body?: string;
  relatedKind?: string;
  relatedId?: string;
}): Promise<NotificationRecord> {
  if (!HAS_DATABASE) {
    const record: NotificationRecord = {
      id: crypto.randomUUID(),
      type: input.type,
      title: input.title,
      body: input.body ?? "",
      relatedKind: input.relatedKind ?? "",
      relatedId: input.relatedId ?? "",
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    fileNotifications.unshift(record);
    if (fileNotifications.length > 500) fileNotifications.length = 500;
    return record;
  }
  const [row] = await db
    .insert(ccNotificationsTable)
    .values({
      type: input.type,
      title: input.title,
      body: input.body ?? "",
      relatedKind: input.relatedKind ?? "",
      relatedId: input.relatedId ?? "",
    })
    .returning();
  return rowToNotification(row);
}

export async function markNotificationRead(id: string, read: boolean): Promise<NotificationRecord | null> {
  const now = read ? new Date() : null;
  if (!HAS_DATABASE) {
    const note = fileNotifications.find((n) => n.id === id);
    if (!note) return null;
    note.readAt = now ? now.toISOString() : null;
    return note;
  }
  const [row] = await db
    .update(ccNotificationsTable)
    .set({ readAt: now })
    .where(eq(ccNotificationsTable.id, id))
    .returning();
  return row ? rowToNotification(row) : null;
}

export async function markAllNotificationsRead(): Promise<number> {
  if (!HAS_DATABASE) {
    const now = new Date().toISOString();
    let count = 0;
    for (const n of fileNotifications) {
      if (!n.readAt) {
        n.readAt = now;
        count += 1;
      }
    }
    return count;
  }
  const result = await db
    .update(ccNotificationsTable)
    .set({ readAt: new Date() })
    .where(sql`${ccNotificationsTable.readAt} IS NULL`)
    .returning();
  return result.length;
}

export async function deleteNotification(id: string): Promise<boolean> {
  if (!HAS_DATABASE) {
    const idx = fileNotifications.findIndex((n) => n.id === id);
    if (idx < 0) return false;
    fileNotifications.splice(idx, 1);
    return true;
  }
  const result = await db
    .delete(ccNotificationsTable)
    .where(eq(ccNotificationsTable.id, id))
    .returning();
  return result.length > 0;
}

export async function pruneOldNotifications(maxAgeDays = 90): Promise<void> {
  if (!HAS_DATABASE) return;
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
  await db.delete(ccNotificationsTable).where(lt(ccNotificationsTable.createdAt, cutoff));
}

// ---------- Analytics ----------
export interface AnalyticsView {
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

const fileAnalytics: AnalyticsView[] = [];

function rowToAnalytics(row: typeof ccAnalyticsViewsTable.$inferSelect): AnalyticsView {
  return {
    id: row.id,
    path: row.path,
    title: row.title ?? "",
    referrer: row.referrer ?? "",
    visitorId: row.visitorId ?? "",
    sessionId: row.sessionId ?? "",
    deviceType: row.deviceType ?? "",
    userAgent: row.userAgent ?? "",
    createdAt: row.createdAt.toISOString(),
  };
}

const recentDedupe = new Map<string, number>();
const DEDUPE_WINDOW_MS = 30_000;

export function shouldRecordView(visitorId: string, path: string): boolean {
  const key = `${visitorId}|${path}`;
  const now = Date.now();
  const last = recentDedupe.get(key);
  if (last && now - last < DEDUPE_WINDOW_MS) return false;
  recentDedupe.set(key, now);
  if (recentDedupe.size > 5000) {
    for (const [k, t] of recentDedupe) {
      if (now - t > DEDUPE_WINDOW_MS) recentDedupe.delete(k);
    }
  }
  return true;
}

export async function recordAnalyticsView(input: {
  path: string;
  title?: string;
  referrer?: string;
  visitorId?: string;
  sessionId?: string;
  deviceType?: string;
  userAgent?: string;
  retentionLimit?: number;
}): Promise<AnalyticsView> {
  const limit = Math.max(100, Math.min(50_000, input.retentionLimit ?? 5000));
  if (!HAS_DATABASE) {
    const record: AnalyticsView = {
      id: crypto.randomUUID(),
      path: input.path,
      title: input.title ?? "",
      referrer: input.referrer ?? "",
      visitorId: input.visitorId ?? "",
      sessionId: input.sessionId ?? "",
      deviceType: input.deviceType ?? "",
      userAgent: input.userAgent ?? "",
      createdAt: new Date().toISOString(),
    };
    fileAnalytics.unshift(record);
    if (fileAnalytics.length > limit) fileAnalytics.length = limit;
    return record;
  }
  const [row] = await db
    .insert(ccAnalyticsViewsTable)
    .values({
      path: input.path,
      title: input.title ?? "",
      referrer: input.referrer ?? "",
      visitorId: input.visitorId ?? "",
      sessionId: input.sessionId ?? "",
      deviceType: input.deviceType ?? "",
      userAgent: (input.userAgent ?? "").slice(0, 500),
    })
    .returning();
  return rowToAnalytics(row);
}

export async function listRecentAnalyticsViews(limit = 50): Promise<AnalyticsView[]> {
  if (!HAS_DATABASE) {
    return fileAnalytics.slice(0, limit);
  }
  const rows = await db
    .select()
    .from(ccAnalyticsViewsTable)
    .orderBy(desc(ccAnalyticsViewsTable.createdAt))
    .limit(limit);
  return rows.map(rowToAnalytics);
}

export interface AnalyticsSummary {
  totalViews: number;
  uniqueVisitors: number;
  viewsToday: number;
  viewsThisWeek: number;
  viewsThisMonth: number;
  topPages: Array<{ path: string; views: number }>;
  recentViews: AnalyticsView[];
  deviceBreakdown: Array<{ device: string; views: number }>;
  referrerBreakdown: Array<{ referrer: string; views: number }>;
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfWeek(d = new Date()) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay());
  return x;
}
function startOfMonth(d = new Date()) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const today = startOfDay();
  const week = startOfWeek();
  const month = startOfMonth();

  if (!HAS_DATABASE) {
    const all = fileAnalytics;
    const totalViews = all.length;
    const uniqueVisitors = new Set(all.map((v) => v.visitorId).filter(Boolean)).size;
    const viewsToday = all.filter((v) => new Date(v.createdAt) >= today).length;
    const viewsThisWeek = all.filter((v) => new Date(v.createdAt) >= week).length;
    const viewsThisMonth = all.filter((v) => new Date(v.createdAt) >= month).length;

    const pageMap = new Map<string, number>();
    const deviceMap = new Map<string, number>();
    const refMap = new Map<string, number>();
    for (const v of all) {
      pageMap.set(v.path, (pageMap.get(v.path) ?? 0) + 1);
      const dev = v.deviceType || "unknown";
      deviceMap.set(dev, (deviceMap.get(dev) ?? 0) + 1);
      if (v.referrer) refMap.set(v.referrer, (refMap.get(v.referrer) ?? 0) + 1);
    }
    const topPages = [...pageMap.entries()]
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
    const deviceBreakdown = [...deviceMap.entries()]
      .map(([device, views]) => ({ device, views }))
      .sort((a, b) => b.views - a.views);
    const referrerBreakdown = [...refMap.entries()]
      .map(([referrer, views]) => ({ referrer, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
    return {
      totalViews,
      uniqueVisitors,
      viewsToday,
      viewsThisWeek,
      viewsThisMonth,
      topPages,
      recentViews: all.slice(0, 20),
      deviceBreakdown,
      referrerBreakdown,
    };
  }

  const [{ value: totalViews }] = await db
    .select({ value: count() })
    .from(ccAnalyticsViewsTable);
  const uniqueRows = await db
    .selectDistinct({ visitorId: ccAnalyticsViewsTable.visitorId })
    .from(ccAnalyticsViewsTable)
    .where(sql`${ccAnalyticsViewsTable.visitorId} <> ''`);
  const uniqueVisitors = uniqueRows.length;

  const [{ value: viewsToday }] = await db
    .select({ value: count() })
    .from(ccAnalyticsViewsTable)
    .where(gte(ccAnalyticsViewsTable.createdAt, today));
  const [{ value: viewsThisWeek }] = await db
    .select({ value: count() })
    .from(ccAnalyticsViewsTable)
    .where(gte(ccAnalyticsViewsTable.createdAt, week));
  const [{ value: viewsThisMonth }] = await db
    .select({ value: count() })
    .from(ccAnalyticsViewsTable)
    .where(gte(ccAnalyticsViewsTable.createdAt, month));

  const topPagesRows = await db
    .select({ path: ccAnalyticsViewsTable.path, views: count() })
    .from(ccAnalyticsViewsTable)
    .groupBy(ccAnalyticsViewsTable.path)
    .orderBy(desc(count()))
    .limit(10);
  const deviceRows = await db
    .select({ device: ccAnalyticsViewsTable.deviceType, views: count() })
    .from(ccAnalyticsViewsTable)
    .groupBy(ccAnalyticsViewsTable.deviceType)
    .orderBy(desc(count()));
  const refRows = await db
    .select({ referrer: ccAnalyticsViewsTable.referrer, views: count() })
    .from(ccAnalyticsViewsTable)
    .where(sql`${ccAnalyticsViewsTable.referrer} <> ''`)
    .groupBy(ccAnalyticsViewsTable.referrer)
    .orderBy(desc(count()))
    .limit(10);

  const recentRows = await db
    .select()
    .from(ccAnalyticsViewsTable)
    .orderBy(desc(ccAnalyticsViewsTable.createdAt))
    .limit(20);

  return {
    totalViews: Number(totalViews ?? 0),
    uniqueVisitors,
    viewsToday: Number(viewsToday ?? 0),
    viewsThisWeek: Number(viewsThisWeek ?? 0),
    viewsThisMonth: Number(viewsThisMonth ?? 0),
    topPages: topPagesRows.map((r) => ({ path: r.path, views: Number(r.views) })),
    deviceBreakdown: deviceRows.map((r) => ({
      device: (r.device || "unknown") as string,
      views: Number(r.views),
    })),
    referrerBreakdown: refRows.map((r) => ({
      referrer: (r.referrer || "") as string,
      views: Number(r.views),
    })),
    recentViews: recentRows.map(rowToAnalytics),
  };
}

export async function pruneAnalytics(retentionLimit: number): Promise<void> {
  const limit = Math.max(100, Math.min(50_000, retentionLimit));
  if (!HAS_DATABASE) {
    if (fileAnalytics.length > limit) fileAnalytics.length = limit;
    return;
  }
  const [{ value: total }] = await db
    .select({ value: count() })
    .from(ccAnalyticsViewsTable);
  const totalNum = Number(total ?? 0);
  if (totalNum <= limit) return;
  const rows = await db
    .select({ id: ccAnalyticsViewsTable.id, createdAt: ccAnalyticsViewsTable.createdAt })
    .from(ccAnalyticsViewsTable)
    .orderBy(desc(ccAnalyticsViewsTable.createdAt))
    .limit(limit)
    .offset(limit - 1);
  const cutoff = rows[rows.length - 1]?.createdAt;
  if (cutoff) {
    await db.delete(ccAnalyticsViewsTable).where(lt(ccAnalyticsViewsTable.createdAt, cutoff));
  }
}
