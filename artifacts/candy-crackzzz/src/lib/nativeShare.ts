export interface ShareDataInput {
  title: string;
  text: string;
  url?: string;
}

export type ShareResult = 'shared' | 'cancelled' | 'unsupported' | 'error';

export function canUseNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export function buildCurrentPageUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.href;
}

function resolveUrl(url?: string): string {
  if (url && url.length > 0) return url;
  return buildCurrentPageUrl();
}

function buildBodyWithUrl(data: ShareDataInput): string {
  const url = resolveUrl(data.url);
  if (!data.text) return url;
  if (!url) return data.text;
  if (data.text.includes(url)) return data.text;
  return `${data.text}\n${url}`;
}

export async function shareNativeOrFallback(data: ShareDataInput): Promise<ShareResult> {
  if (!canUseNativeShare()) return 'unsupported';
  const payload: ShareData = {
    title: data.title,
    text: data.text,
  };
  const url = resolveUrl(data.url);
  if (url) payload.url = url;

  try {
    await navigator.share(payload);
    return 'shared';
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return 'cancelled';
    return 'error';
  }
}

export function buildSmsShareUrl(data: ShareDataInput): string {
  const body = buildBodyWithUrl(data);
  return `sms:?&body=${encodeURIComponent(body)}`;
}

export function buildEmailShareUrl(data: ShareDataInput): string {
  const subject = data.title || 'Candy CrackZZZ';
  const body = buildBodyWithUrl(data);
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

async function copyToClipboard(value: string): Promise<boolean> {
  if (!value) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall through
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

export async function copyShareLink(url?: string): Promise<boolean> {
  const target = resolveUrl(url);
  if (!target) return false;
  return copyToClipboard(target);
}

export async function copyShareMessage(data: ShareDataInput): Promise<boolean> {
  const body = buildBodyWithUrl(data);
  if (!body) return false;
  return copyToClipboard(body);
}
