import type { MerchItem, Product, ProductCategory, MerchCategory } from '@/types';

const PRODUCT_CATEGORY_NOUN: Record<ProductCategory, string> = {
  'candy-grapes': 'candy-coated grapes',
  'candy-pineapple': 'candy-coated pineapple',
  'party-trays': 'party tray',
  'seasonal': 'seasonal candy creation',
  'custom': 'custom candy creation',
  'donutzzz': 'candy-cracked donut',
  'dirty-sodazzz': 'dirty soda',
};

const PRODUCT_CATEGORY_VIBE: Record<ProductCategory, string[]> = {
  'candy-grapes': [
    'Crisp grapes hand-rolled in our signature candy crunch.',
    'Cold-snap grapes wearing a glassy candy shell.',
    'Juicy bite, candy-shell crackle, repeat.',
  ],
  'candy-pineapple': [
    'Tropical pineapple chunks under a glossy candy coat.',
    'Bright pineapple meets bold candy crunch.',
    'Sun-ripe pineapple with a sugar-glass finish.',
  ],
  'party-trays': [
    'Built to feed the whole crew with mixed flavors and colors.',
    'A loaded tray of fan-favorite picks, ready to share.',
    'Your party centerpiece — colorful, loud, and gone in minutes.',
  ],
  'seasonal': [
    'Limited-run flavor inspired by the season.',
    'Here for a good time, not a long time.',
    'Seasonal drop — once it\'s gone, it\'s gone.',
  ],
  'custom': [
    'Built to order around your event, colors, and flavors.',
    'Tell us the vibe — we build the tray.',
    'Made-to-order so every bite matches your theme.',
  ],
  'donutzzz': [
    'Pillow-soft donut hugged by a candy-crack glaze.',
    'Bakery-fresh donut with a sugar-shell snap.',
    'Sweet, glossy, and built for sharing.',
  ],
  'dirty-sodazzz': [
    'Bold soda blended with cream, fruit, and a candy-rim cup.',
    'Fizz, cream, and fruit in a single loud sip.',
    'Tropical-meets-classic dirty soda, served ice cold.',
  ],
};

const MERCH_CATEGORY_NOUN: Record<MerchCategory, string> = {
  apparel: 'apparel piece',
  accessories: 'accessory',
  drinkware: 'drinkware',
  stickers: 'sticker',
  home: 'home goods piece',
  vendor: 'vendor / staff piece',
  other: 'collectible',
};

const MERCH_CATEGORY_VIBE: Record<MerchCategory, string[]> = {
  apparel: [
    'Streetwear-ready fit with bold candy-drip energy.',
    'Soft, heavyweight feel made to be worn loud.',
    'Wear-it-everywhere fit with that Candy CrackZZZ pop.',
  ],
  accessories: [
    'Small detail, big statement.',
    'The finishing touch on any candy-crew fit.',
    'Pocket-sized brand flex.',
  ],
  drinkware: [
    'Sip in style — built to ride along all day.',
    'Bold-color drinkware made for the candy crew.',
    'Keeps the vibe (and your drink) on point.',
  ],
  stickers: [
    'Slap it on a laptop, hydro flask, or skate deck.',
    'Tiny piece of the brand, big visual hit.',
    'Made to stick, made to flex.',
  ],
  home: [
    'Bring the candy-shop energy into the crib.',
    'A bold piece of the brand for your space.',
    'Brand statement for any room.',
  ],
  vendor: [
    'Built for staff and vendors repping at events.',
    'Crew-only piece for the people pushing the trays.',
    'Made for the team behind the candy.',
  ],
  other: [
    'A limited collectible from the candy crew.',
    'One more way to rock the brand.',
    'A drop for the real ones.',
  ],
};

const HYPE_OPENERS = [
  'Real talk:',
  'Heads up:',
  'Quick pitch:',
  'Not gonna lie,',
  'Listen,',
];

const FRUIT_KEYWORDS: Record<string, string> = {
  strawberry: 'red strawberry punch',
  cherry: 'deep cherry sweetness',
  apple: 'crisp apple snap',
  grape: 'cold grape pop',
  raspberry: 'raspberry tang',
  lemon: 'sharp lemon zing',
  lime: 'lime kick',
  orange: 'orange citrus glow',
  mango: 'mango tropical hit',
  pineapple: 'pineapple sunshine',
  watermelon: 'watermelon cool-down',
  peach: 'peach softness',
  banana: 'banana cream',
  kiwi: 'kiwi sour edge',
  coconut: 'coconut creaminess',
  berry: 'mixed-berry burst',
  rainbow: 'rainbow flavor mix',
};

function pick<T>(arr: T[], seed: string, offset = 0): T {
  if (!arr.length) return arr[0];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const idx = (Math.abs(h) + offset) % arr.length;
  return arr[idx];
}

function dedupeJoin(parts: (string | undefined | null | false)[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    if (!p) continue;
    const t = p.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out.join(' ');
}

function flavorToVibe(flavorNotes: string): string {
  if (!flavorNotes) return '';
  const lower = flavorNotes.toLowerCase();
  const hits: string[] = [];
  for (const k of Object.keys(FRUIT_KEYWORDS)) {
    if (lower.includes(k)) hits.push(FRUIT_KEYWORDS[k]);
    if (hits.length >= 2) break;
  }
  if (hits.length === 0) return `Tasting notes: ${flavorNotes}.`;
  return `Expect ${hits.join(' and ')}.`;
}

function colorVibe(colorThemeNotes: string): string {
  if (!colorThemeNotes) return '';
  return `Color vibe: ${colorThemeNotes}.`;
}

function statusLine(p: { isSeasonal?: boolean; isFeatured?: boolean; isCustomEligible?: boolean; isSoldOut?: boolean }): string {
  if (p.isSoldOut) return 'Currently sold out — check back soon.';
  const tags: string[] = [];
  if (p.isFeatured) tags.push('fan-favorite');
  if (p.isSeasonal) tags.push('limited seasonal drop');
  if (p.isCustomEligible) tags.push('available for custom orders');
  if (!tags.length) return '';
  return `Tagged as ${tags.join(', ')}.`;
}

export function generateProductDescription(p: Partial<Product>): string {
  const name = (p.name || '').trim() || 'this drop';
  const cat: ProductCategory = (p.category as ProductCategory) || 'candy-grapes';
  const noun = PRODUCT_CATEGORY_NOUN[cat] ?? 'candy treat';
  const vibe = pick(PRODUCT_CATEGORY_VIBE[cat] ?? ['Bold candy energy in every bite.'], name);
  const opener = pick(HYPE_OPENERS, name, 1);

  const sentences = [
    `${opener} ${name} is our ${noun} done the Candy CrackZZZ way.`,
    vibe,
    flavorToVibe(p.flavorNotes || ''),
    colorVibe(p.colorThemeNotes || ''),
    statusLine(p),
  ];

  return dedupeJoin(sentences);
}

export function generateShortProductDescription(p: Partial<Product>): string {
  const name = (p.name || '').trim() || 'this drop';
  const cat: ProductCategory = (p.category as ProductCategory) || 'candy-grapes';
  const noun = PRODUCT_CATEGORY_NOUN[cat] ?? 'candy treat';
  const flavor = (p.flavorNotes || '').trim();
  const seed = `${name}|short`;

  const templates = [
    `${name}: ${noun} with that Candy CrackZZZ snap.`,
    `Bold ${noun}, candy-shell crunch, ready to share.`,
    `${noun.charAt(0).toUpperCase() + noun.slice(1)} done loud.`,
  ];
  let line = pick(templates, seed);
  if (flavor && line.length + flavor.length + 4 <= 95) {
    line = `${line} (${flavor})`;
  }
  return line.slice(0, 100);
}

export function generateMerchDescription(m: Partial<MerchItem>): string {
  const name = (m.name || '').trim() || 'this piece';
  const cat: MerchCategory = (m.category as MerchCategory) || 'apparel';
  const noun = MERCH_CATEGORY_NOUN[cat] ?? 'piece';
  const vibe = pick(MERCH_CATEGORY_VIBE[cat] ?? ['Bold brand energy.'], name);
  const opener = pick(HYPE_OPENERS, name, 2);

  const sizes = (m.sizes || []).filter(Boolean);
  const colors = (m.colors || []).filter(Boolean);
  const sizeLine = sizes.length ? `Sizes: ${sizes.join(', ')}.` : '';
  const colorLine = colors.length ? `Colors: ${colors.join(', ')}.` : '';

  const featured = m.isFeatured ? 'A featured drop for the candy crew.' : '';
  const stock =
    m.status === 'out-of-stock' ? 'Currently out of stock.' :
    m.status === 'coming-soon' ? 'Coming soon — drop alert ready.' :
    m.status === 'limited' ? 'Limited run — grab while it lasts.' :
    '';

  const sentences = [
    `${opener} ${name} is our ${noun} for the Candy CrackZZZ crew.`,
    vibe,
    sizeLine,
    colorLine,
    featured,
    stock,
  ];

  return dedupeJoin(sentences);
}
