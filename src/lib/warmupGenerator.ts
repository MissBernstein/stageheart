export type WarmupVibe =
  | 'bright_playful'
  | 'warm_emotional'
  | 'strong_powerful'
  | 'grounded_spiritual';

export type VoiceType = 'soprano' | 'alto' | 'tenor' | 'bass' | null;
export type Technique = 'belting' | 'head_voice';

export interface WarmupRequest {
  vibe: WarmupVibe;
  voiceType: VoiceType;
  techniques: Technique[];
}

export interface WarmupPlan {
  physicalWarmups: string[];
  vocalWarmups: string[];
  emotionalPrep: string[];
  duration: number;
}

interface WarmupVibeConfig {
  label: string;
  subtitle: string;
  physical: string[];
  vocal: string[];
  emotional: string[];
  baseDuration: number;
}

interface VoiceRange {
  low: string;
  high: string;
}

const VOICE_RANGES: Record<Exclude<VoiceType, null>, VoiceRange> = {
  soprano: { low: 'A3', high: 'C6' },
  alto: { low: 'F3', high: 'A5' },
  tenor: { low: 'C3', high: 'E5' },
  bass: { low: 'E2', high: 'C4' },
};

const VIBE_CONFIGS: Record<WarmupVibe, WarmupVibeConfig> = {
  bright_playful: {
    label: 'Bright / Playful',
    subtitle: 'light, sparkly',
    baseDuration: 14,
    physical: [
      'Light bounce with shoulder rolls (30 seconds) to energise articulation.',
      'Quick side-to-side twists with loose arms to keep movement buoyant.',
      'Jaw and tongue shakes paired with gentle hops to release surface tension.',
    ],
    vocal: [
      'Staccato five-note scales on “mee” from {low} to {high} keeping tone bright.',
      'Chromatic articulation drill on “dee-daw” across {range} with quick tempo.',
      'Ascending arpeggio pops on “nay” finishing with a playful slide toward {high}.',
    ],
    emotional: [
      'Smile through each phrase and imagine sparkling stage lights.',
      'Channel a playful audience response with buoyant gestures between sets.',
      'Keep breaths quick but released to match an upbeat groove.',
    ],
  },
  warm_emotional: {
    label: 'Warm / Emotional',
    subtitle: 'tender, nostalgic',
    baseDuration: 16,
    physical: [
      'Slow rib expansion breaths with wide arm arcs (4-count inhale / 4-count exhale).',
      'Neck and shoulder circles with jaw massage to encourage openness.',
      'Forward fold spine roll then stack vertebrae to feel grounded support.',
    ],
    vocal: [
      'Legato five-note scales on “noo” through {range} with gentle crescendos.',
      'Descending slides on “ah” from {high} to {low} keeping resonance round.',
      'Octave glides on “oo” allowing the tone to bloom at {high}.',
    ],
    emotional: [
      'Recall a tender memory and let it colour your vowel warmth.',
      'Shape phrases like a cinematic swell, adding subtle cresc/decresc.',
      'Stay connected to breath, imagining it as a supportive hug.',
    ],
  },
  strong_powerful: {
    label: 'Strong / Powerful',
    subtitle: 'bold, anthemic',
    baseDuration: 17,
    physical: [
      'Grounded power stance with four-count inhale, hiss release activating core.',
      'Dynamic lunges with arm punches to prime full-body engagement.',
      'Wall push engages ribs and back while sustaining a strong hiss on exhale.',
    ],
    vocal: [
      'Interval leaps (4th/5th) on “yah” from {low} toward {high} with punchy accents.',
      'Sustained tone holds on “ah” for 6 counts across {range}.',
      'Crescendo/decrescendo power sirens sliding into mix peaks near {high}.',
    ],
    emotional: [
      'Visualise singing to the back row with confident intent.',
      'Practise commanding posture—feel ribs and pelvic floor working together.',
      'Affirm bold phrases (“I’ve got this”) between sets to anchor power.',
    ],
  },
  grounded_spiritual: {
    label: 'Grounded / Spiritual',
    subtitle: 'calm, reverent',
    baseDuration: 15,
    physical: [
      'Slow diaphragmatic breaths (6-count inhale / 6-count exhale) with soft knees.',
      'Gentle spine rolls with prayer hands to connect breath and body.',
      'Palm-to-palm resonance taps over chest and cheekbones to awaken vibration.',
    ],
    vocal: [
      'Hums on “mm” and “nn” across {range} focusing resonance forward.',
      'Legato vowel shifts on “oo-oh-ah” staying relaxed from {low} to {high}.',
      'Descending sirens on “oo” with feather-light onset into {low}.',
    ],
    emotional: [
      'Picture a calm sacred space and let the sound float on the room.',
      'Keep dynamics gentle, imagining warm candlelight guiding your phrases.',
      'Ground feet into the floor and notice breath moving vertically.',
    ],
  },
};

export const WARMUP_VIBE_OPTIONS = Object.entries(VIBE_CONFIGS).map(([id, config]) => ({
  id: id as WarmupVibe,
  label: config.label,
  subtitle: config.subtitle,
}));

const TECHNIQUE_MODIFIERS: Record<Technique, { physical: string[]; vocal: string[]; emotional: string[]; }> = {
  belting: {
    physical: [
      'Supported wall slides with 4-count hiss to fire chest engagement.',
      'Plank shoulder taps for 30 seconds keeping ribs buoyant for belt support.',
    ],
    vocal: [
      '5th-leap patterns on “yeah” from {low} up to {high} focusing chest-mix balance.',
      'Sustained 4-count holds on “AY” with consonant energisers (G / B / M) at medium-high volume.',
    ],
    emotional: [
      'Visualise projecting over a band while staying relaxed in the jaw.',
    ],
  },
  head_voice: {
    physical: [
      'Gentle siren lip trills easing from chest into head coordination.',
    ],
    vocal: [
      'Octave sirens on lip trills from {low} to {high} with feather-light onset.',
      '“NG” to “oo” slides across {range} keeping tone suspended and legato.',
    ],
    emotional: [
      'Imagine floating above the melody with effortless lift.',
    ],
  },
};

const replaceRangePlaceholders = (text: string, range: VoiceRange | null) => {
  if (!range) {
    return text
      .replace('{range}', 'your comfortable range')
      .replace('{low}', 'a comfortable low note')
      .replace('{high}', 'a comfortable high note');
  }

  const span = `${range.low}–${range.high}`;
  return text
    .replace('{range}', span)
    .replace('{low}', range.low)
    .replace('{high}', range.high);
};

const mergeUnique = (items: string[]) => Array.from(new Set(items));

export const generateWarmupPlan = ({ vibe, voiceType, techniques }: WarmupRequest): WarmupPlan => {
  const config = VIBE_CONFIGS[vibe];
  const range = voiceType ? VOICE_RANGES[voiceType] : null;

  const formatList = (list: string[]) => list.map(item => replaceRangePlaceholders(item, range));

  let physical = formatList(config.physical);
  let vocal = formatList(config.vocal);
  let emotional = [...config.emotional];
  let duration = config.baseDuration;

  techniques.forEach(tech => {
    const modifier = TECHNIQUE_MODIFIERS[tech];
    if (!modifier) return;
    physical = physical.concat(formatList(modifier.physical));
    vocal = vocal.concat(formatList(modifier.vocal));
    emotional = emotional.concat(modifier.emotional);
    duration += 3;
  });

  if (voiceType) {
    duration += 1;
  }

  return {
    physicalWarmups: mergeUnique(physical),
    vocalWarmups: mergeUnique(vocal),
    emotionalPrep: mergeUnique(emotional),
    duration,
  };
};
