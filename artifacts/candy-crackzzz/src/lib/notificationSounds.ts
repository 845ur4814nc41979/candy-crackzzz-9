let audioCtx: AudioContext | null = null;
let unlocked = false;
const listeners = new Set<() => void>();

function debug(...args: unknown[]) {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage?.getItem('cc_audio_debug') === '1') {
      // eslint-disable-next-line no-console
      console.log('[notificationSounds]', ...args);
    }
  } catch {
    // ignore
  }
}

function notify() {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      // ignore
    }
  }
}

export function subscribeNotificationAudio(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audioCtx) return audioCtx;
  const Ctor: typeof AudioContext | undefined =
    (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) {
    debug('AudioContext not supported');
    return null;
  }
  try {
    audioCtx = new Ctor();
    debug('Created AudioContext, state =', audioCtx.state);
  } catch (err) {
    debug('Failed to create AudioContext', err);
    audioCtx = null;
  }
  return audioCtx;
}

export async function unlockNotificationAudio(): Promise<boolean> {
  const ctx = getCtx();
  if (!ctx) {
    debug('unlock: no AudioContext available');
    return false;
  }
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
      debug('unlock: resume() ok, state =', ctx.state);
    } catch (err) {
      debug('unlock: resume() failed', err);
      return false;
    }
  }
  if (ctx.state !== 'running') {
    debug('unlock: ctx still not running, state =', ctx.state);
    return false;
  }
  // Play a tiny silent buffer to fully satisfy iOS Safari unlock requirements.
  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start(0);
  } catch (err) {
    debug('unlock: silent buffer play failed', err);
  }
  const wasUnlocked = unlocked;
  unlocked = true;
  if (!wasUnlocked) notify();
  debug('unlock: audio unlocked, ready to play');
  return true;
}

export function canPlayNotificationAudio(): boolean {
  if (!unlocked) return false;
  const ctx = getCtx();
  if (!ctx) return false;
  return ctx.state === 'running';
}

export function isAudioContextSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const Ctor =
    (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return !!Ctor;
}

async function ensureRunning(): Promise<boolean> {
  const ctx = getCtx();
  if (!ctx) return false;
  const state = ctx.state as string;
  if (state === 'running') return true;
  if (state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }
  return (ctx.state as string) === 'running';
}

function clampVolume(v: number): number {
  if (!Number.isFinite(v)) return 0.7;
  return Math.max(0, Math.min(1, v));
}

interface ToneSpec {
  frequency: number;
  duration: number;
  delay: number;
  type?: OscillatorType;
}

async function playTones(specs: ToneSpec[], volume: number): Promise<boolean> {
  const ctx = getCtx();
  if (!ctx) {
    debug('playTones: no AudioContext');
    return false;
  }
  const ok = await ensureRunning();
  if (!ok) {
    debug('playTones: ctx not running, state =', ctx.state);
    if (unlocked) {
      // Context died (e.g. tab suspended). Mark as locked so UI re-prompts.
      unlocked = false;
      notify();
    }
    return false;
  }
  const masterGain = ctx.createGain();
  masterGain.gain.value = clampVolume(volume);
  masterGain.connect(ctx.destination);

  const now = ctx.currentTime;
  for (const spec of specs) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = spec.type ?? 'sine';
    osc.frequency.value = spec.frequency;
    const start = now + spec.delay;
    const end = start + spec.duration;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.9, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(start);
    osc.stop(end + 0.02);
  }
  debug('playTones: scheduled', specs.length, 'tones at vol', volume);
  return true;
}

export async function playOrderNotificationSound(volume = 0.7): Promise<boolean> {
  // Bright two-note chime: G5 -> C6
  return playTones(
    [
      { frequency: 784, duration: 0.18, delay: 0, type: 'triangle' },
      { frequency: 1047, duration: 0.28, delay: 0.18, type: 'triangle' },
    ],
    volume,
  );
}

export async function playMessageNotificationSound(volume = 0.7): Promise<boolean> {
  // Soft double ping: E5 short, then A5
  return playTones(
    [
      { frequency: 659, duration: 0.12, delay: 0, type: 'sine' },
      { frequency: 880, duration: 0.18, delay: 0.13, type: 'sine' },
    ],
    volume,
  );
}

export async function playGeneralNotificationSound(volume = 0.7): Promise<boolean> {
  // Short neutral beep: A5
  return playTones(
    [{ frequency: 880, duration: 0.18, delay: 0, type: 'square' }],
    volume * 0.6,
  );
}
