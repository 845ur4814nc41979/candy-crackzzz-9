import type { OrderRequest, ReferralCode, ReferralEvent, RewardProfile, RewardTransaction, Settings } from '@/types';

function createShortId(prefix: string) {
  return `${prefix}-${(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).slice(0, 8).toUpperCase()}`;
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, '');
}

export function normalizeReferralCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

export function generateReferralCode(customerName?: string) {
  const cleaned = (customerName || 'CC').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const seed = cleaned.slice(0, 4) || 'CCZZ';
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${seed}-${suffix}`;
}

export function ensureRewardProfileReferralCode(profile: RewardProfile) {
  return profile.referralCode ? profile.referralCode : generateReferralCode(profile.customerName);
}

export function calculateEstimatedPoints(params: {
  settings: Settings;
  orderTotal: number;
  rewardsOptIn: boolean;
  matchedRewardProfile?: RewardProfile | null;
}) {
  const { settings, orderTotal, rewardsOptIn, matchedRewardProfile } = params;

  if (!settings.enableRewards || !rewardsOptIn) return 0;

  let points = Math.floor(orderTotal * Math.max(0, settings.rewardsPointsPerDollar));

  if (settings.rewardsDoublePointsEnabled) {
    points += Math.floor(orderTotal * Math.max(0, settings.rewardsPointsPerDollar));
  }

  if (settings.rewardsSpendThresholdEnabled && orderTotal >= settings.rewardsSpendThresholdAmount) {
    points += settings.rewardsSpendThresholdBonusPoints;
  }

  if (settings.rewardsFirstOrderBonusEnabled && matchedRewardProfile && matchedRewardProfile.totalOrders === 0) {
    points += settings.rewardsFirstOrderBonusPoints;
  }

  return points;
}

export function awardCompletedOrderRewards(params: {
  order: OrderRequest;
  settings: Settings;
  rewardProfiles: RewardProfile[];
}) {
  const { order, settings } = params;
  let rewardProfiles = params.rewardProfiles.map(profile => ({
    ...profile,
    referralCode: ensureRewardProfileReferralCode(profile),
    successfulReferralCount: profile.successfulReferralCount ?? 0,
    lifetimeReferralPointsEarned: profile.lifetimeReferralPointsEarned ?? 0,
  }));

  const newRewardTransactions: RewardTransaction[] = [];
  let newReferralEvent: ReferralEvent | null = null;
  let newReferralCodeEntry: ReferralCode | null = null;

  // Finalize a pending redemption attached at checkout: deduct the points and
  // log a "redeemed" history entry. Runs whether or not rewards are enabled
  // now, because the redemption was already recorded against the customer.
  const pendingRedemption = order.rewardsRedemptionStatus === 'pending'
    ? Math.max(0, Number(order.rewardsRedeemedPoints) || 0)
    : 0;
  let redemptionFinalized = false;
  if (pendingRedemption > 0) {
    const normalizedPhoneForRedeem = normalizePhone(order.phone || '');
    if (normalizedPhoneForRedeem) {
      const at = new Date().toISOString();
      rewardProfiles = rewardProfiles.map(profile => {
        if (normalizePhone(profile.phone) !== normalizedPhoneForRedeem) return profile;
        const deduct = Math.min(pendingRedemption, profile.currentPoints);
        if (deduct <= 0) return profile;
        redemptionFinalized = true;
        newRewardTransactions.push({
          id: createShortId('RWT'),
          profileId: profile.id,
          profilePhone: profile.phone,
          profileName: profile.customerName,
          type: 'redeemed',
          points: -deduct,
          orderId: order.id,
          note: `Reward redeemed at checkout ($${(Number(order.rewardsDiscountAmount) || 0).toFixed(2)} off).`,
          createdAt: at,
          createdBy: 'system',
        });
        return {
          ...profile,
          currentPoints: profile.currentPoints - deduct,
          lifetimePointsRedeemed: profile.lifetimePointsRedeemed + deduct,
          rewardsHistory: [{
            id: createShortId('RWH'),
            type: 'redeemed' as const,
            points: -deduct,
            orderId: order.id,
            note: `Reward redeemed at checkout ($${(Number(order.rewardsDiscountAmount) || 0).toFixed(2)} off).`,
            createdAt: at,
          }, ...profile.rewardsHistory],
        };
      });
    }
  }

  if (!settings.enableRewards || !order.rewardsOptIn) {
    return {
      updatedProfiles: rewardProfiles,
      awardedPoints: 0,
      referralReferrerPointsAwarded: 0,
      referralReferredCustomerPointsAwarded: 0,
      redemptionFinalized,
      newRewardTransactions,
      newReferralEvent,
      newReferralCodeEntry,
    };
  }

  const normalizedPhone = normalizePhone(order.phone || '');
  if (!normalizedPhone) {
    return {
      updatedProfiles: rewardProfiles,
      awardedPoints: 0,
      referralReferrerPointsAwarded: 0,
      referralReferredCustomerPointsAwarded: 0,
      redemptionFinalized,
      newRewardTransactions,
      newReferralEvent,
      newReferralCodeEntry,
    };
  }

  const existingProfile = rewardProfiles.find(profile => normalizePhone(profile.phone) === normalizedPhone) ?? null;
  const basePointsToAward = calculateEstimatedPoints({
    settings,
    orderTotal: order.total,
    rewardsOptIn: !!order.rewardsOptIn,
    matchedRewardProfile: existingProfile,
  });

  const normalizedReferralCodeUsed = normalizeReferralCode(order.referralCodeUsed || '');
  const referralProfile = settings.enableReferrals && normalizedReferralCodeUsed
    ? rewardProfiles.find(profile => normalizeReferralCode(profile.referralCode || '') === normalizedReferralCodeUsed) ?? null
    : null;

  const isSelfReferral = !!referralProfile && normalizePhone(referralProfile.phone) === normalizedPhone;
  const isFirstCompletedOrder = (existingProfile?.totalOrders ?? 0) === 0;
  const referralEligible = !!(
    settings.enableReferrals &&
    settings.referralBonusOnFirstCompletedOrder &&
    normalizedReferralCodeUsed &&
    referralProfile &&
    !isSelfReferral &&
    isFirstCompletedOrder
  );

  const referralReferredCustomerPointsAwarded = referralEligible ? Math.max(0, settings.referralReferredCustomerBonusPoints) : 0;
  const referralReferrerPointsAwarded = referralEligible ? Math.max(0, settings.referralReferrerBonusPoints) : 0;
  const totalCustomerPointsAwarded = basePointsToAward + referralReferredCustomerPointsAwarded;
  const awardedAt = new Date().toISOString();

  if (!existingProfile) {
    const newProfileId = createShortId('RWD');
    const newReferralCode = generateReferralCode(order.customerName);
    const newProfile: RewardProfile = {
      id: newProfileId,
      customerName: order.customerName,
      phone: order.phone,
      email: order.email || undefined,
      currentPoints: totalCustomerPointsAwarded,
      lifetimePointsEarned: totalCustomerPointsAwarded,
      lifetimePointsRedeemed: 0,
      totalOrders: 1,
      lastOrderDate: awardedAt,
      smsMarketingOptIn: !!order.smsMarketingOptIn,
      referralCode: newReferralCode,
      referredByCode: referralEligible ? normalizedReferralCodeUsed : undefined,
      successfulReferralCount: 0,
      lifetimeReferralPointsEarned: referralReferredCustomerPointsAwarded,
      rewardsHistory: [
        ...(basePointsToAward > 0 ? [{
          id: createShortId('RWH'),
          type: 'earned' as const,
          points: basePointsToAward,
          orderId: order.id,
          note: 'Points awarded when order was marked completed.',
          createdAt: awardedAt,
        }] : []),
        ...(referralReferredCustomerPointsAwarded > 0 ? [{
          id: createShortId('RWH'),
          type: 'bonus' as const,
          points: referralReferredCustomerPointsAwarded,
          orderId: order.id,
          note: `Referral bonus from code ${normalizedReferralCodeUsed}.`,
          createdAt: awardedAt,
        }] : []),
      ],
    };

    // Create RewardTransaction records
    if (basePointsToAward > 0) {
      newRewardTransactions.push({
        id: createShortId('RWT'),
        profileId: newProfileId,
        profilePhone: order.phone,
        profileName: order.customerName,
        type: 'earned',
        points: basePointsToAward,
        orderId: order.id,
        note: 'Points awarded when order was marked completed.',
        createdAt: awardedAt,
        createdBy: 'system',
      });
    }
    if (referralReferredCustomerPointsAwarded > 0) {
      newRewardTransactions.push({
        id: createShortId('RWT'),
        profileId: newProfileId,
        profilePhone: order.phone,
        profileName: order.customerName,
        type: 'referral-bonus',
        points: referralReferredCustomerPointsAwarded,
        orderId: order.id,
        note: `Referral bonus from code ${normalizedReferralCodeUsed}.`,
        createdAt: awardedAt,
        createdBy: 'system',
      });
    }

    // Create ReferralCode entry for the new profile
    newReferralCodeEntry = {
      id: `RFC-${newProfileId}`,
      code: newReferralCode,
      ownerProfileId: newProfileId,
      ownerPhone: order.phone,
      ownerName: order.customerName,
      isActive: true,
      createdAt: awardedAt,
    };

    const updatedProfiles = [newProfile, ...rewardProfiles].map(profile => {
      if (!referralEligible || !referralProfile || normalizePhone(profile.phone) !== normalizePhone(referralProfile.phone)) return profile;
      if (referralReferrerPointsAwarded > 0) {
        newRewardTransactions.push({
          id: createShortId('RWT'),
          profileId: profile.id,
          profilePhone: profile.phone,
          profileName: profile.customerName,
          type: 'referral-bonus',
          points: referralReferrerPointsAwarded,
          orderId: order.id,
          note: `Referral reward for ${order.customerName}.`,
          createdAt: awardedAt,
          createdBy: 'system',
        });
      }
      return {
        ...profile,
        currentPoints: profile.currentPoints + referralReferrerPointsAwarded,
        lifetimePointsEarned: profile.lifetimePointsEarned + referralReferrerPointsAwarded,
        successfulReferralCount: (profile.successfulReferralCount ?? 0) + 1,
        lifetimeReferralPointsEarned: (profile.lifetimeReferralPointsEarned ?? 0) + referralReferrerPointsAwarded,
        rewardsHistory: referralReferrerPointsAwarded > 0 ? [{
          id: createShortId('RWH'),
          type: 'bonus' as const,
          points: referralReferrerPointsAwarded,
          orderId: order.id,
          note: `Referral reward for ${order.customerName}.`,
          createdAt: awardedAt,
        }, ...profile.rewardsHistory] : profile.rewardsHistory,
      };
    });

    // Create ReferralEvent if eligible
    if (referralEligible && referralProfile) {
      newReferralEvent = {
        id: createShortId('REV'),
        referralCode: normalizedReferralCodeUsed,
        referrerProfileId: referralProfile.id,
        referrerPhone: referralProfile.phone,
        referrerName: referralProfile.customerName,
        referredPhone: order.phone,
        referredName: order.customerName,
        orderId: order.id,
        status: 'completed',
        referrerBonusPoints: referralReferrerPointsAwarded,
        referredBonusPoints: referralReferredCustomerPointsAwarded,
        bonusAwardedAt: awardedAt,
        isSelfReferral: false,
        createdAt: awardedAt,
      };
    } else if (normalizedReferralCodeUsed && isSelfReferral) {
      newReferralEvent = {
        id: createShortId('REV'),
        referralCode: normalizedReferralCodeUsed,
        referrerProfileId: newProfileId,
        referrerPhone: order.phone,
        referrerName: order.customerName,
        referredPhone: order.phone,
        referredName: order.customerName,
        orderId: order.id,
        status: 'rejected',
        referrerBonusPoints: 0,
        referredBonusPoints: 0,
        isSelfReferral: true,
        createdAt: awardedAt,
      };
    }

    return {
      updatedProfiles,
      awardedPoints: totalCustomerPointsAwarded,
      referralReferrerPointsAwarded,
      referralReferredCustomerPointsAwarded,
      redemptionFinalized,
      newRewardTransactions,
      newReferralEvent,
      newReferralCodeEntry,
    };
  }

  // Existing profile path
  const updatedProfiles = rewardProfiles.map(profile => {
    if (normalizePhone(profile.phone) === normalizedPhone) {
      if (basePointsToAward > 0) {
        newRewardTransactions.push({
          id: createShortId('RWT'),
          profileId: profile.id,
          profilePhone: profile.phone,
          profileName: profile.customerName,
          type: 'earned',
          points: basePointsToAward,
          orderId: order.id,
          note: 'Points awarded when order was marked completed.',
          createdAt: awardedAt,
          createdBy: 'system',
        });
      }
      if (referralReferredCustomerPointsAwarded > 0) {
        newRewardTransactions.push({
          id: createShortId('RWT'),
          profileId: profile.id,
          profilePhone: profile.phone,
          profileName: profile.customerName,
          type: 'referral-bonus',
          points: referralReferredCustomerPointsAwarded,
          orderId: order.id,
          note: `Referral bonus from code ${normalizedReferralCodeUsed}.`,
          createdAt: awardedAt,
          createdBy: 'system',
        });
      }
      return {
        ...profile,
        referralCode: ensureRewardProfileReferralCode(profile),
        customerName: order.customerName || profile.customerName,
        phone: order.phone || profile.phone,
        email: order.email || profile.email,
        smsMarketingOptIn: !!order.smsMarketingOptIn || profile.smsMarketingOptIn,
        currentPoints: profile.currentPoints + totalCustomerPointsAwarded,
        lifetimePointsEarned: profile.lifetimePointsEarned + totalCustomerPointsAwarded,
        totalOrders: profile.totalOrders + 1,
        lastOrderDate: awardedAt,
        referredByCode: profile.referredByCode || (referralEligible ? normalizedReferralCodeUsed : undefined),
        lifetimeReferralPointsEarned: (profile.lifetimeReferralPointsEarned ?? 0) + referralReferredCustomerPointsAwarded,
        rewardsHistory: [
          ...(basePointsToAward > 0 ? [{
            id: createShortId('RWH'),
            type: 'earned' as const,
            points: basePointsToAward,
            orderId: order.id,
            note: 'Points awarded when order was marked completed.',
            createdAt: awardedAt,
          }] : []),
          ...(referralReferredCustomerPointsAwarded > 0 ? [{
            id: createShortId('RWH'),
            type: 'bonus' as const,
            points: referralReferredCustomerPointsAwarded,
            orderId: order.id,
            note: `Referral bonus from code ${normalizedReferralCodeUsed}.`,
            createdAt: awardedAt,
          }] : []),
          ...profile.rewardsHistory,
        ],
      };
    }

    if (referralEligible && referralProfile && normalizePhone(profile.phone) === normalizePhone(referralProfile.phone)) {
      if (referralReferrerPointsAwarded > 0) {
        newRewardTransactions.push({
          id: createShortId('RWT'),
          profileId: profile.id,
          profilePhone: profile.phone,
          profileName: profile.customerName,
          type: 'referral-bonus',
          points: referralReferrerPointsAwarded,
          orderId: order.id,
          note: `Referral reward for ${order.customerName}.`,
          createdAt: awardedAt,
          createdBy: 'system',
        });
      }
      return {
        ...profile,
        referralCode: ensureRewardProfileReferralCode(profile),
        currentPoints: profile.currentPoints + referralReferrerPointsAwarded,
        lifetimePointsEarned: profile.lifetimePointsEarned + referralReferrerPointsAwarded,
        successfulReferralCount: (profile.successfulReferralCount ?? 0) + 1,
        lifetimeReferralPointsEarned: (profile.lifetimeReferralPointsEarned ?? 0) + referralReferrerPointsAwarded,
        rewardsHistory: referralReferrerPointsAwarded > 0 ? [{
          id: createShortId('RWH'),
          type: 'bonus' as const,
          points: referralReferrerPointsAwarded,
          orderId: order.id,
          note: `Referral reward for ${order.customerName}.`,
          createdAt: awardedAt,
        }, ...profile.rewardsHistory] : profile.rewardsHistory,
      };
    }

    return profile;
  });

  // Create ReferralEvent if eligible
  if (referralEligible && referralProfile) {
    newReferralEvent = {
      id: createShortId('REV'),
      referralCode: normalizedReferralCodeUsed,
      referrerProfileId: referralProfile.id,
      referrerPhone: referralProfile.phone,
      referrerName: referralProfile.customerName,
      referredPhone: order.phone,
      referredName: order.customerName,
      orderId: order.id,
      status: 'completed',
      referrerBonusPoints: referralReferrerPointsAwarded,
      referredBonusPoints: referralReferredCustomerPointsAwarded,
      bonusAwardedAt: awardedAt,
      isSelfReferral: false,
      createdAt: awardedAt,
    };
  } else if (normalizedReferralCodeUsed && existingProfile) {
    const selfRef = normalizePhone(existingProfile.phone) === normalizedPhone &&
      normalizeReferralCode(existingProfile.referralCode || '') === normalizedReferralCodeUsed;
    if (selfRef) {
      newReferralEvent = {
        id: createShortId('REV'),
        referralCode: normalizedReferralCodeUsed,
        referrerProfileId: existingProfile.id,
        referrerPhone: existingProfile.phone,
        referrerName: existingProfile.customerName,
        referredPhone: order.phone,
        referredName: order.customerName,
        orderId: order.id,
        status: 'rejected',
        referrerBonusPoints: 0,
        referredBonusPoints: 0,
        isSelfReferral: true,
        createdAt: awardedAt,
      };
    }
  }

  return {
    updatedProfiles,
    awardedPoints: totalCustomerPointsAwarded,
    referralReferrerPointsAwarded,
    referralReferredCustomerPointsAwarded,
    redemptionFinalized,
    newRewardTransactions,
    newReferralEvent,
    newReferralCodeEntry,
  };
}

/**
 * Pick the best discount tier the customer can afford right now (highest
 * discount within their balance, no upgrades). Returns null if none.
 */
export function pickEligibleRewardTier(params: {
  settings: Settings;
  currentPoints: number;
  cartGrossTotal: number;
}): { points: number; discount: number } | null {
  const { settings, currentPoints, cartGrossTotal } = params;
  if (!settings.enableRewards) return null;
  const tiers = [
    { points: settings.rewardsTier1Points, discount: settings.rewardsTier1Discount },
    { points: settings.rewardsTier2Points, discount: settings.rewardsTier2Discount },
    { points: settings.rewardsTier3Points, discount: settings.rewardsTier3Discount },
  ].filter(t => t.points > 0 && t.discount > 0)
    .filter(t => t.points <= currentPoints && t.discount <= cartGrossTotal)
    .sort((a, b) => b.discount - a.discount);
  return tiers[0] ?? null;
}

/** All redemption tiers configured (irrespective of customer balance). */
export function listRewardTiers(settings: Settings): { points: number; discount: number }[] {
  return [
    { points: settings.rewardsTier1Points, discount: settings.rewardsTier1Discount },
    { points: settings.rewardsTier2Points, discount: settings.rewardsTier2Discount },
    { points: settings.rewardsTier3Points, discount: settings.rewardsTier3Discount },
  ].filter(t => t.points > 0 && t.discount > 0).sort((a, b) => a.points - b.points);
}
