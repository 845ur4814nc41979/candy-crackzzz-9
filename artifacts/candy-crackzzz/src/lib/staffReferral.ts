import type { OrderRequest, RewardProfile } from '@/types';

export const STAFF_REFERRAL_STORAGE_KEY = 'cc_staff_referral_code';

export type StaffReferralBonusStatus = 'none' | 'pending' | 'approved' | 'paid' | 'cancelled' | 'ineligible';

export type StaffReferralUser = {
  id: string;
  username: string;
  status?: string;
  role?: string;
  employeeReferralCode?: string;
  employeeReferralEnabled?: boolean;
};

export interface StaffReferralSettings {
  enableStaffReferralProgram: boolean;
  allowStaffReferralLinks: boolean;
  showStaffReferralCard: boolean;
  staffReferralRequireRewardsSignup: boolean;
  staffReferralRequireFirstCompletedOrder: boolean;
  staffReferralApprovalRequired: boolean;
  staffReferralAllowSignupBonus: boolean;
  staffReferralAllowFirstOrderBonus: boolean;
  staffReferralAllowEveryCompletedOrder: boolean;
  staffReferralAllowLimitedTimeBonus: boolean;
  staffReferralRecurringBonusDays: number;
  staffReferralPreventSelfReferrals: boolean;
  staffReferralExcludeCancelledOrders: boolean;
  staffReferralExcludeRefundedOrders: boolean;
  staffReferralIncludePickupOrders: boolean;
  staffReferralIncludeDeliveryOrders: boolean;
  staffReferralIncludeMerchOrders: boolean;
  staffReferralIncludeDonutzzzOrders: boolean;
  staffReferralIncludeDirtySodazzzOrders: boolean;
  staffReferralIncludeCandyFruitOrders: boolean;
  staffReferralFixedSignupBonus: number;
  staffReferralFixedFirstOrderBonus: number;
  staffReferralFirstOrderBonusPercent: number;
  staffReferralFirstOrderBonusMaxAmount: number;
  staffReferralRecurringOrderBonusPercent: number;
  staffReferralRecurringBonusMaxPerOrder: number;
  staffReferralMinimumOrderTotal: number;
  staffReferralMaxBonusPerOrder: number;
  staffReferralMaxBonusPerCustomer: number;
  staffReferralMaxBonusPerStaffPerMonth: number;
  staffReferralPointBonusPercent: number;
  staffReferralPointToCashValue: number;
  enableStaffReferralMilestones: boolean;
  staffReferralMilestone1Count: number;
  staffReferralMilestone1Bonus: number;
  staffReferralMilestone2Count: number;
  staffReferralMilestone2Bonus: number;
  staffReferralMilestone3Count: number;
  staffReferralMilestone3Bonus: number;
}

export const defaultStaffReferralSettings: StaffReferralSettings = {
  enableStaffReferralProgram: false,
  allowStaffReferralLinks: true,
  showStaffReferralCard: true,
  staffReferralRequireRewardsSignup: true,
  staffReferralRequireFirstCompletedOrder: true,
  staffReferralApprovalRequired: true,
  staffReferralAllowSignupBonus: false,
  staffReferralAllowFirstOrderBonus: true,
  staffReferralAllowEveryCompletedOrder: false,
  staffReferralAllowLimitedTimeBonus: false,
  staffReferralRecurringBonusDays: 90,
  staffReferralPreventSelfReferrals: true,
  staffReferralExcludeCancelledOrders: true,
  staffReferralExcludeRefundedOrders: true,
  staffReferralIncludePickupOrders: true,
  staffReferralIncludeDeliveryOrders: true,
  staffReferralIncludeMerchOrders: true,
  staffReferralIncludeDonutzzzOrders: true,
  staffReferralIncludeDirtySodazzzOrders: true,
  staffReferralIncludeCandyFruitOrders: true,
  staffReferralFixedSignupBonus: 0,
  staffReferralFixedFirstOrderBonus: 5,
  staffReferralFirstOrderBonusPercent: 0,
  staffReferralFirstOrderBonusMaxAmount: 0,
  staffReferralRecurringOrderBonusPercent: 0,
  staffReferralRecurringBonusMaxPerOrder: 0,
  staffReferralMinimumOrderTotal: 0,
  staffReferralMaxBonusPerOrder: 0,
  staffReferralMaxBonusPerCustomer: 0,
  staffReferralMaxBonusPerStaffPerMonth: 0,
  staffReferralPointBonusPercent: 0,
  staffReferralPointToCashValue: 0.01,
  enableStaffReferralMilestones: false,
  staffReferralMilestone1Count: 5,
  staffReferralMilestone1Bonus: 25,
  staffReferralMilestone2Count: 10,
  staffReferralMilestone2Bonus: 75,
  staffReferralMilestone3Count: 25,
  staffReferralMilestone3Bonus: 250,
};

export function getStaffReferralSettings(settings: unknown): StaffReferralSettings {
  return { ...defaultStaffReferralSettings, ...(settings as Partial<StaffReferralSettings> | undefined) };
}

export function normalizeStaffReferralCode(value?: string | null): string {
  return (value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24);
}

function compactUserName(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'CREW';
}

export function staffReferralCodeForUser(user: StaffReferralUser | null | undefined): string {
  if (!user) return '';
  const explicit = normalizeStaffReferralCode(user.employeeReferralCode);
  if (explicit) return explicit;
  return normalizeStaffReferralCode(`CREW${compactUserName(user.username || user.id)}`);
}

export function isStaffReferralUserEnabled(user: StaffReferralUser | null | undefined): boolean {
  if (!user || user.status === 'disabled') return false;
  if (user.employeeReferralEnabled === false) return false;
  return user.role !== 'viewer';
}

export function findStaffByReferralCode(users: StaffReferralUser[], code?: string | null) {
  const normalized = normalizeStaffReferralCode(code);
  if (!normalized) return null;
  return users.find((user) => isStaffReferralUserEnabled(user) && staffReferralCodeForUser(user) === normalized) ?? null;
}

export function buildStaffReferralLink(user: StaffReferralUser, origin?: string): string {
  const safeOrigin = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  const code = staffReferralCodeForUser(user);
  return `${safeOrigin}/rewards?staffRef=${encodeURIComponent(code)}`;
}

export function staffReferralShareText(user: StaffReferralUser, origin?: string): string {
  return `Join Candy CrackZZZ Rewardzzz with my link and check out the sweet stuff: ${buildStaffReferralLink(user, origin)}`;
}

export function captureStaffReferralFromCurrentUrl(): string {
  if (typeof window === 'undefined') return '';
  try {
    const params = new URLSearchParams(window.location.search);
    const code = normalizeStaffReferralCode(params.get('staffRef') || params.get('crewRef') || '');
    if (code) window.localStorage.setItem(STAFF_REFERRAL_STORAGE_KEY, code);
    return code;
  } catch {
    return '';
  }
}

export function readStoredStaffReferralCode(): string {
  if (typeof window === 'undefined') return '';
  try {
    return normalizeStaffReferralCode(window.localStorage.getItem(STAFF_REFERRAL_STORAGE_KEY) || '');
  } catch {
    return '';
  }
}

export function orderEmployeeReferralCode(order: OrderRequest): string {
  return normalizeStaffReferralCode((order as any).employeeReferralCodeUsed || (order as any).staffReferralCodeUsed || '');
}

export function profileStaffReferralCode(profile?: RewardProfile | null): string {
  return normalizeStaffReferralCode((profile as any)?.referredByStaffCode || (profile as any)?.staffReferralCodeUsed || '');
}

function money(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/** Calculate the signup bonus for a staff member when a referred customer joins rewards. */
export function calculateSignupBonus(args: {
  staffCode: string;
  settings: unknown;
}): { amount: number; status: StaffReferralBonusStatus; note: string } {
  const s = getStaffReferralSettings(args.settings);
  if (!s.enableStaffReferralProgram) {
    return { amount: 0, status: 'none' as StaffReferralBonusStatus, note: 'Staff Referralzzz is disabled.' };
  }
  if (!s.staffReferralAllowSignupBonus) {
    return { amount: 0, status: 'ineligible' as StaffReferralBonusStatus, note: 'Signup bonus is disabled in settings.' };
  }
  if (!args.staffCode) {
    return { amount: 0, status: 'ineligible' as StaffReferralBonusStatus, note: 'No staff code attached.' };
  }
  const amount = money(s.staffReferralFixedSignupBonus);
  if (amount <= 0) {
    return { amount: 0, status: 'ineligible' as StaffReferralBonusStatus, note: 'Fixed signup bonus is $0.00.' };
  }
  return {
    amount,
    status: (s.staffReferralApprovalRequired ? 'pending' : 'approved') as StaffReferralBonusStatus,
    note: `$${amount.toFixed(2)} fixed signup bonus`,
  };
}

export function calculateStaffReferralBonus(args: {
  order: OrderRequest;
  settings: unknown;
  isFirstCompletedOrder: boolean;
  rewardPointsAwarded?: number;
}) {
  const s = getStaffReferralSettings(args.settings);
  if (!s.enableStaffReferralProgram) {
    return { amount: 0, status: 'none' as StaffReferralBonusStatus, note: 'Staff Referralzzz is disabled.' };
  }
  if (s.staffReferralExcludeCancelledOrders && args.order.status === 'cancelled') {
    return { amount: 0, status: 'cancelled' as StaffReferralBonusStatus, note: 'Cancelled order excluded.' };
  }
  if (s.staffReferralRequireFirstCompletedOrder && !args.isFirstCompletedOrder && !s.staffReferralAllowEveryCompletedOrder) {
    return { amount: 0, status: 'ineligible' as StaffReferralBonusStatus, note: 'Only the first completed order earns a staff bonus.' };
  }

  const total = money(args.order.total);
  if (total < s.staffReferralMinimumOrderTotal) {
    return { amount: 0, status: 'ineligible' as StaffReferralBonusStatus, note: `Order is below the $${s.staffReferralMinimumOrderTotal.toFixed(2)} minimum.` };
  }

  let amount = 0;
  const parts: string[] = [];

  if (args.isFirstCompletedOrder && s.staffReferralAllowFirstOrderBonus) {
    if (s.staffReferralFixedFirstOrderBonus > 0) {
      amount += s.staffReferralFixedFirstOrderBonus;
      parts.push(`$${s.staffReferralFixedFirstOrderBonus.toFixed(2)} first-order bonus`);
    }
    if (s.staffReferralFirstOrderBonusPercent > 0) {
      let percentBonus = total * (s.staffReferralFirstOrderBonusPercent / 100);
      if (s.staffReferralFirstOrderBonusMaxAmount > 0) percentBonus = Math.min(percentBonus, s.staffReferralFirstOrderBonusMaxAmount);
      amount += percentBonus;
      parts.push(`${s.staffReferralFirstOrderBonusPercent}% first-order bonus`);
    }
  }

  if (!args.isFirstCompletedOrder && s.staffReferralAllowEveryCompletedOrder && s.staffReferralRecurringOrderBonusPercent > 0) {
    let recurringBonus = total * (s.staffReferralRecurringOrderBonusPercent / 100);
    if (s.staffReferralRecurringBonusMaxPerOrder > 0) recurringBonus = Math.min(recurringBonus, s.staffReferralRecurringBonusMaxPerOrder);
    amount += recurringBonus;
    parts.push(`${s.staffReferralRecurringOrderBonusPercent}% recurring order bonus`);
  }

  if (s.staffReferralPointBonusPercent > 0 && s.staffReferralPointToCashValue > 0 && args.rewardPointsAwarded) {
    const pointsBonus = args.rewardPointsAwarded * (s.staffReferralPointBonusPercent / 100) * s.staffReferralPointToCashValue;
    amount += pointsBonus;
    parts.push(`${s.staffReferralPointBonusPercent}% of customer Rewardzzz points`);
  }

  if (s.staffReferralMaxBonusPerOrder > 0) amount = Math.min(amount, s.staffReferralMaxBonusPerOrder);
  amount = Math.round(amount * 100) / 100;

  if (amount <= 0) {
    return { amount: 0, status: 'ineligible' as StaffReferralBonusStatus, note: 'No active bonus rule produced a cash amount.' };
  }

  return {
    amount,
    status: (s.staffReferralApprovalRequired ? 'pending' : 'approved') as StaffReferralBonusStatus,
    note: parts.join(' + ') || 'Staff Referralzzz bonus',
  };
}

export function getStaffReferralStats(args: {
  user: StaffReferralUser;
  orders: OrderRequest[];
  rewardProfiles?: RewardProfile[];
}) {
  const code = staffReferralCodeForUser(args.user);
  const referredProfiles = (args.rewardProfiles ?? []).filter((profile) => profileStaffReferralCode(profile) === code);
  const referralOrders = args.orders.filter((order) => orderEmployeeReferralCode(order) === code);
  const completedReferralOrders = referralOrders.filter((order) => order.status === 'completed');

  const orderSumByStatus = (status: StaffReferralBonusStatus) => referralOrders.reduce((sum, order) => {
    const orderStatus = ((order as any).employeeReferralBonusStatus || 'none') as StaffReferralBonusStatus;
    return orderStatus === status ? sum + money((order as any).employeeReferralBonusAmount) : sum;
  }, 0);

  const signupSumByStatus = (status: StaffReferralBonusStatus) => referredProfiles.reduce((sum, profile) => {
    const bonusStatus = ((profile as any).staffSignupBonusStatus || 'none') as StaffReferralBonusStatus;
    return bonusStatus === status ? sum + money((profile as any).staffSignupBonusAmount) : sum;
  }, 0);

  const orderLifetime = referralOrders.reduce((sum, order) => {
    const s = ((order as any).employeeReferralBonusStatus || 'none') as StaffReferralBonusStatus;
    return ['pending', 'approved', 'paid'].includes(s) ? sum + money((order as any).employeeReferralBonusAmount) : sum;
  }, 0);
  const signupLifetime = referredProfiles.reduce((sum, profile) => {
    const s = ((profile as any).staffSignupBonusStatus || 'none') as StaffReferralBonusStatus;
    return ['pending', 'approved', 'paid'].includes(s) ? sum + money((profile as any).staffSignupBonusAmount) : sum;
  }, 0);

  return {
    code,
    link: buildStaffReferralLink(args.user),
    signupCount: referredProfiles.length,
    completedOrderCount: completedReferralOrders.length,
    pendingBonus: orderSumByStatus('pending') + signupSumByStatus('pending'),
    approvedBonus: orderSumByStatus('approved') + signupSumByStatus('approved'),
    paidBonus: orderSumByStatus('paid') + signupSumByStatus('paid'),
    lifetimeBonus: orderLifetime + signupLifetime,
    orders: referralOrders,
    referredProfiles,
  };
}
