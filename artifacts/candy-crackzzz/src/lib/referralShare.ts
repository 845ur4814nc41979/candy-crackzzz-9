import type { Settings } from '@/types';

export interface ReferralShareContext {
  code: string;
  settings: Pick<
    Settings,
    'enableReferrals' | 'businessName' | 'referralReferrerBonusPoints' | 'referralReferredCustomerBonusPoints'
  >;
}

export function getReferralShareUrl(code?: string) {
  if (typeof window === 'undefined') return '';
  const base = `${window.location.origin}/rewards`;
  const cleaned = (code || '').trim();
  if (!cleaned) return base;
  return `${base}?ref=${encodeURIComponent(cleaned)}`;
}

export function buildReferralShareTitle(settings: ReferralShareContext['settings']) {
  const brand = settings.businessName?.trim() || 'Candy Crackzzz';
  return `${brand} Referral`;
}

export function buildReferralShareMessage({ code, settings }: ReferralShareContext) {
  if (!code) return '';
  const brand = settings.businessName?.trim() || 'Candy Crackzzz';
  const url = getReferralShareUrl(code);
  const friendBonus = Math.max(0, Number(settings.referralReferredCustomerBonusPoints) || 0);
  const myBonus = Math.max(0, Number(settings.referralReferrerBonusPoints) || 0);

  const lines: string[] = [
    `Use my ${brand} referral code ${code} when you order and we can both earn rewards!`,
  ];

  if (settings.enableReferrals && (friendBonus > 0 || myBonus > 0)) {
    const bonusBits: string[] = [];
    if (friendBonus > 0) bonusBits.push(`you may earn ${friendBonus} bonus points`);
    if (myBonus > 0) bonusBits.push(`I may earn ${myBonus} bonus points`);
    lines.push(`On your first eligible completed order, ${bonusBits.join(' and ')}.`);
  }

  if (url) lines.push(`Join rewards here: ${url}`);

  return lines.join(' ');
}

export function buildSmsShareUrl(ctx: ReferralShareContext) {
  const body = buildReferralShareMessage(ctx);
  return `sms:?&body=${encodeURIComponent(body)}`;
}

export function buildEmailShareUrl(ctx: ReferralShareContext) {
  const subject = buildReferralShareTitle(ctx.settings);
  const body = buildReferralShareMessage(ctx);
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function isNativeShareSupported() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

async function copyToClipboard(value: string) {
  if (!value) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall through to legacy fallback
  }

  try {
    if (typeof document === 'undefined') return false;
    const el = document.createElement('textarea');
    el.value = value;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export async function copyReferralCode(code: string) {
  return copyToClipboard(code);
}

export async function copyReferralMessage(ctx: ReferralShareContext) {
  return copyToClipboard(buildReferralShareMessage(ctx));
}

export async function shareReferralCode(ctx: ReferralShareContext): Promise<'shared' | 'cancelled' | 'unsupported' | 'error'> {
  if (!ctx.code) return 'error';
  if (!isNativeShareSupported()) return 'unsupported';
  const data: ShareData = {
    title: buildReferralShareTitle(ctx.settings),
    text: buildReferralShareMessage(ctx),
    url: getReferralShareUrl(ctx.code) || undefined,
  };
  try {
    await navigator.share(data);
    return 'shared';
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return 'cancelled';
    return 'error';
  }
}
