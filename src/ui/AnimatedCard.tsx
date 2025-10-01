import { forwardRef } from 'react';
import type React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motionDur, motionEase } from './motion';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

type AnimatedCardProps = React.ComponentProps<typeof Card>;

const MotionCard = motion(Card);

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(({ className, children, ...props }, ref) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  const motionProps = !prefersReducedMotion
    ? {
        whileHover: { y: -3, scale: 1.01 },
        whileTap: { scale: 0.99 },
        transition: { duration: motionDur.fast / 1000, ease: motionEase.standard },
      }
    : {};

  return (
    <MotionCard
      ref={ref}
      className={cn(
        'motion-safe-only transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      )}
      {...motionProps}
      {...props}
    >
      {children}
    </MotionCard>
  );
});

AnimatedCard.displayName = 'AnimatedCard';
