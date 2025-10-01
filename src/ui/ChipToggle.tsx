import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { motionDur, motionEase } from './motion';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

interface ChipToggleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
}

export const ChipToggle = forwardRef<HTMLButtonElement, ChipToggleProps>(
  ({ children, className, isActive = false, disabled, ...props }, ref) => {
    const prefersReducedMotion = usePrefersReducedMotion();
    const baseClasses = cn(
      'relative overflow-hidden rounded-full border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      isActive ? 'border-primary bg-primary/15 text-primary' : 'border-card-border bg-card/50 text-card-foreground/80',
      disabled && 'cursor-not-allowed opacity-60',
      className,
    );

    return (
      <motion.button
        ref={ref}
        className={baseClasses}
        type="button"
        disabled={disabled}
        whileTap={!prefersReducedMotion && !disabled ? { scale: 0.97 } : undefined}
        transition={{ duration: motionDur.xfast / 1000, ease: motionEase.standard }}
        {...props}
      >
        {!prefersReducedMotion && (
          <>
            <motion.span
              className="pointer-events-none absolute inset-0 z-0 rounded-full bg-primary/20"
              initial={false}
              animate={isActive ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: motionDur.fast / 1000, ease: motionEase.standard }}
            />
            <motion.span
              className="pointer-events-none absolute inset-0 z-0 rounded-full bg-primary/30"
              initial={false}
              animate={isActive ? { scale: 1.4, opacity: 0 } : { scale: 0.8, opacity: 0 }}
              transition={{ duration: motionDur.fast / 1000, ease: motionEase.entrance }}
            />
          </>
        )}
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </motion.button>
    );
  },
);

ChipToggle.displayName = 'ChipToggle';
