export const CANONICAL_THEMES = [
  'Unconditional support & comfort',
  'Joyful praise & faith',
  'Hopeful unity & empowerment',
  'Freedom / breaking free',
  'Playful groove & flirtation',
  'Tender love & devotion',
  'Nostalgia & holiday warmth',
  'Bittersweet peace & solitude',
  'Yearning & reunion',
  'Identity & authenticity',
  'Resilience & striving',
  'Awe & contemplation',
  'Drama & inner turmoil',
  'Rebellion & defiance',
  'Grief & solace',
] as const;

export type CanonicalTheme = (typeof CANONICAL_THEMES)[number];

const FALLBACK_THEME: CanonicalTheme = 'Awe & contemplation';

type ThemeRule = {
  canonical: CanonicalTheme;
  patterns: RegExp[];
};

const createPatterns = (keywords: string[]): RegExp[] =>
  keywords.map((keyword) => new RegExp(keyword, 'i'));

const THEME_RULES: ThemeRule[] = [
  {
    canonical: 'Drama & inner turmoil',
    patterns: createPatterns([
      'drama',
      'turmoil',
      'conflicted',
      'epic struggle',
      'inner battle',
      'guilt',
    ]),
  },
  {
    canonical: 'Rebellion & defiance',
    patterns: createPatterns([
      'rebellion',
      'defiance',
      'rebel',
      'unstoppable',
      'fight',
      'power',
      'swagger',
    ]),
  },
  {
    canonical: 'Grief & solace',
    patterns: createPatterns([
      'grief',
      'solace',
      'mourning',
      'comfort.*pain',
      'sorrow',
      'loss',
    ]),
  },
  {
    canonical: 'Nostalgia & holiday warmth',
    patterns: createPatterns([
      'holiday',
      'christmas',
      'nostalgia',
      'festive',
      'season',
      'snow',
    ]),
  },
  {
    canonical: 'Playful groove & flirtation',
    patterns: createPatterns([
      'playful',
      'flirt',
      'groove',
      'funk',
      'cheeky',
      'sass',
      'swagger',
      'self-assurance',
    ]),
  },
  {
    canonical: 'Yearning & reunion',
    patterns: createPatterns([
      'yearning',
      'come home',
      'reunion',
      'return',
    ]),
  },
  {
    canonical: 'Bittersweet peace & solitude',
    patterns: createPatterns([
      'bittersweet',
      'solitude',
      'alone',
      'quiet strength',
      'stillness',
      'dock',
      'bay',
    ]),
  },
  {
    canonical: 'Freedom / breaking free',
    patterns: createPatterns([
      'freedom',
      'breaking free',
      'break free',
      'rebell',
      'mustang',
      'river',
      'leave.*behind',
    ]),
  },
  {
    canonical: 'Resilience & striving',
    patterns: createPatterns([
      'resilience',
      'striving',
      'keep going',
      'higher ground',
      'self-betterment',
      'rise up',
      'stronger',
    ]),
  },
  {
    canonical: 'Hopeful unity & empowerment',
    patterns: createPatterns([
      'unity',
      'togetherness',
      'collective',
      'we\\b',
      'yes we can',
      'communal',
      'together',
      'stand together',
      'uplift',
      'collective strength',
      'stand up',
    ]),
  },
  {
    canonical: 'Identity & authenticity',
    patterns: createPatterns([
      'identity',
      'authentic',
      'reclaim',
      'who i am',
      'vulnerability',
      'true self',
    ]),
  },
  {
    canonical: 'Joyful praise & faith',
    patterns: createPatterns([
      'praise',
      'worship',
      'hosanna',
      'faith',
      'prayer',
      'gospel',
      'hallelujah',
      'divine',
      'god',
      'supply',
      'surrender to divine',
      'sacred reverence',
    ]),
  },
  {
    canonical: 'Tender love & devotion',
    patterns: createPatterns([
      'tender',
      'love',
      'devotion',
      'romantic',
      'whole-hearted',
      'attraction',
      'gratitude',
      'affection',
      'adoration',
    ]),
  },
  {
    canonical: 'Unconditional support & comfort',
    patterns: createPatterns([
      'unconditional support',
      'support',
      'friend',
      'safe place',
      'got your back',
    ]),
  },
  {
    canonical: 'Awe & contemplation',
    patterns: createPatterns([
      'awe',
      'contempl',
      'reverence',
      'holy',
      'holiness',
      'serene',
      'peace',
      'wonder',
    ]),
  },
];

const matchesRule = (text: string, rule: ThemeRule): boolean =>
  rule.patterns.some((pattern) => pattern.test(text));

const findCanonicalTheme = (normalized: string): CanonicalTheme | null => {
  if (!normalized) {
    return null;
  }

  for (const rule of THEME_RULES) {
    if (matchesRule(normalized, rule)) {
      return rule.canonical;
    }
  }

  return null;
};

export const canonicalizeTheme = (
  theme: string,
): { canonical: CanonicalTheme; detail?: string } => {
  const detail = theme?.trim();
  const normalized = detail?.toLowerCase() ?? '';
  const match = findCanonicalTheme(normalized);

  return {
    canonical: match ?? FALLBACK_THEME,
    detail: detail || undefined,
  };
};

export const matchCanonicalTheme = (
  text: string,
): { canonical: CanonicalTheme; matched: boolean } => {
  const detail = text?.trim();
  const normalized = detail?.toLowerCase() ?? '';
  const match = findCanonicalTheme(normalized);

  return {
    canonical: match ?? FALLBACK_THEME,
    matched: Boolean(match),
  };
};

export const getCanonicalThemes = (): CanonicalTheme[] =>
  [...CANONICAL_THEMES].sort((a, b) => a.localeCompare(b));
