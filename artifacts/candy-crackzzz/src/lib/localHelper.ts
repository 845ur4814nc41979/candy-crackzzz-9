import type { MerchItem, Product, Settings } from '@/types';

export type HelperRecommendation = {
  kind: 'product' | 'merch';
  id: string;
  name: string;
  slug?: string;
};

export type HelperReply = {
  reply: string;
  recommendations: HelperRecommendation[];
  topic: 'flavor' | 'merch' | 'rewards' | 'referral' | 'custom' | 'logistics' | 'general';
  disclaimer?: string;
};

const FLAVOR_KEYWORDS = [
  'sweet', 'sour', 'spicy', 'tangy', 'tart', 'fruity', 'tropical', 'creamy', 'chewy',
  'strawberry', 'cherry', 'apple', 'grape', 'grapes', 'raspberry', 'blue raspberry',
  'lemon', 'lemonade', 'lime', 'orange', 'mango', 'pineapple', 'watermelon',
  'peach', 'banana', 'kiwi', 'coconut', 'berry', 'mixed', 'rainbow',
  'pink', 'blue', 'red', 'green', 'purple', 'yellow',
  'habanero', 'chamoy', 'tajin', 'chili',
];

const MERCH_KEYWORDS = [
  'merch', 'shirt', 'tee', 't-shirt', 'tshirt', 'hoodie', 'sweater',
  'hat', 'cap', 'beanie', 'tumbler', 'cup', 'drinkware', 'mug',
  'sticker', 'apron', 'tote', 'bag', 'sparkly', 'rhinestone',
];

const CUSTOM_KEYWORDS = ['custom', 'tray', 'party', 'birthday', 'gift', 'holiday', 'event', 'wedding', 'shower', 'graduation'];
const REWARDS_KEYWORDS = ['reward', 'rewards', 'points', 'loyalty', 'discount'];
const REFERRAL_KEYWORDS = ['referral', 'refer', 'friend code', 'invite'];
const LOGISTICS_KEYWORDS = ['delivery', 'pickup', 'pick up', 'ship', 'shipping', 'when', 'where', 'address'];

function tokenize(input: string): string[] {
  return input.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function matchScore(haystack: string, terms: string[]): number {
  const text = haystack.toLowerCase();
  let score = 0;
  for (const t of terms) {
    if (!t) continue;
    if (text.includes(t)) score += t.includes(' ') ? 3 : 2;
  }
  return score;
}

export function buildHelperResponse(
  rawInput: string,
  products: Product[],
  merch: MerchItem[],
  settings: Settings,
): HelperReply {
  const input = (rawInput || '').trim();
  const lower = input.toLowerCase();
  const tokens = tokenize(lower);

  const wantsMerch = MERCH_KEYWORDS.some(k => lower.includes(k));
  const wantsCustom = CUSTOM_KEYWORDS.some(k => lower.includes(k));
  const wantsRewards = REWARDS_KEYWORDS.some(k => lower.includes(k));
  const wantsReferral = REFERRAL_KEYWORDS.some(k => lower.includes(k));
  const wantsLogistics = LOGISTICS_KEYWORDS.some(k => lower.includes(k));

  const flavorTerms = FLAVOR_KEYWORDS.filter(k => lower.includes(k));
  const merchTerms = MERCH_KEYWORDS.filter(k => lower.includes(k));

  const max = Math.max(1, Math.min(6, settings.helperMaxRecommendations || 3));
  const recommendations: HelperRecommendation[] = [];
  const disclaimer = settings.helperAllergyDisclaimer || undefined;

  // Default topic decision
  let topic: HelperReply['topic'] = 'general';

  // FLAVOR / MENU MATCHING (prefer if the user mentioned any flavor token or didn't specifically ask for non-flavor topics)
  const productPool = products.filter(p => p.isVisible && p.isAvailable && !p.isSoldOut);
  if (flavorTerms.length || (!wantsMerch && !wantsRewards && !wantsReferral && !wantsCustom && !wantsLogistics && tokens.length > 0)) {
    const scored = productPool
      .map(p => {
        const hay = `${p.name} ${p.shortDescription} ${p.description} ${p.flavorNotes} ${p.colorThemeNotes} ${p.category}`;
        const score = matchScore(hay, flavorTerms.length ? flavorTerms : tokens);
        return { p, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, max);
    for (const { p } of scored) {
      recommendations.push({ kind: 'product', id: p.id, name: p.name, slug: p.slug });
    }
    if (scored.length) topic = 'flavor';
  }

  // MERCH MATCHING
  if (wantsMerch && settings.helperAllowMerchSuggestions) {
    const merchPool = merch.filter(m => m.isActive && m.status !== 'out-of-stock');
    const scored = merchPool
      .map(m => {
        const hay = `${m.name} ${m.description} ${m.category} ${m.colors?.join(' ') || ''}`;
        const score = matchScore(hay, merchTerms.length ? merchTerms : tokens);
        return { m, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, max);
    for (const { m } of scored) {
      if (recommendations.length >= max) break;
      recommendations.push({ kind: 'merch', id: m.id, name: m.name });
    }
    if (scored.length) topic = 'merch';
  }

  // Build reply text based on topic
  let reply: string;
  if (wantsRewards && settings.helperAllowRewardsSuggestions) {
    topic = 'rewards';
    reply = settings.enableRewards
      ? 'You can earn loyalty points on completed orders. Check the Rewards page after you order to see your balance and any tier discounts the shop has set up.'
      : 'The rewards program is currently turned off. Please check back later.';
  } else if (wantsReferral && settings.helperAllowReferralSuggestions) {
    topic = 'referral';
    reply = settings.enableReferrals
      ? 'You can use a friend referral code at checkout. Both you and your friend can earn bonus points after the order is completed.'
      : 'Referrals are currently turned off. Please check back later.';
  } else if (wantsCustom && settings.helperAllowCustomOrderIdeas) {
    topic = 'custom';
    reply = 'For a custom order, think about a party tray with mixed flavors — candy grapes, candy pineapple, and a seasonal touch all work well. Tell me your event vibe (birthday, holiday, theme color) and I can suggest matching items from the menu.';
  } else if (wantsLogistics) {
    topic = 'logistics';
    const parts: string[] = [];
    if (settings.enablePickup) parts.push('pickup');
    if (settings.enableDelivery) parts.push('delivery');
    reply = parts.length
      ? `We currently support ${parts.join(' and ')}. You can pick your option at checkout. Order timing is confirmed by the shop after you submit.`
      : 'Ordering options are not available right now. Please check back later.';
  } else if (recommendations.length) {
    if (topic === 'merch') {
      reply = `Here are merch picks that match what you said. They come from the live shop catalog only.`;
    } else {
      reply = `Here are menu picks that match what you said. They come from the live menu only.`;
    }
  } else if (input.length === 0) {
    reply = settings.helperGreeting;
  } else {
    reply = settings.helperFallbackMessage;
  }

  return { reply, recommendations: recommendations.slice(0, max), topic, disclaimer };
}
