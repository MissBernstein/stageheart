export const motionDur = {
  xfast: 90,
  fast: 160,
  base: 220,
  slow: 320,
  xslow: 450,
} as const;

export const motionEase = {
  standard: [0.2, 0.8, 0.2, 1] as const,
  entrance: [0.12, 0.8, 0.2, 1] as const,
  exit: [0.4, 0, 1, 1] as const,
} as const;

export const springSoft = { type: 'spring', stiffness: 220, damping: 26 } as const;
export const springSnappy = { type: 'spring', stiffness: 360, damping: 30 } as const;

export const fadeInUp = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: motionDur.base / 1000, ease: motionEase.entrance },
  },
  exit: {
    opacity: 0,
    y: 4,
    transition: { duration: motionDur.fast / 1000, ease: motionEase.exit },
  },
} as const;
