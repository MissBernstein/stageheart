import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import type { HTMLAttributes } from 'react';
import { motionDur, motionEase, springSoft } from './motion';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

const variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: motionDur.base / 1000, ease: motionEase.entrance },
  },
  exit: { opacity: 0, y: -6, transition: { duration: motionDur.fast / 1000, ease: motionEase.exit } },
};

interface AnimatedListItemProps extends HTMLAttributes<HTMLLIElement> {
  index?: number;
}

export const AnimatedListItem = forwardRef<HTMLLIElement, AnimatedListItemProps>(({ children, style, ...props }, ref) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const layoutTransition: any = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring', stiffness: springSoft.stiffness, damping: springSoft.damping };

  return (
    <motion.li
      ref={ref}
      layout={!prefersReducedMotion}
      style={style}
      variants={variants}
      initial={prefersReducedMotion ? false : 'initial'}
      animate={prefersReducedMotion ? undefined : 'animate'}
      exit={prefersReducedMotion ? undefined : 'exit'}
  transition={layoutTransition}
      {...props}
    >
      {children}
    </motion.li>
  );
});

AnimatedListItem.displayName = 'AnimatedListItem';
