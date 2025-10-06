import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motionDur, motionEase } from './motion';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

const MotionButton = motion(Button);

interface AnimatedButtonProps extends Omit<ButtonProps, 'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd'> {
  isLoading?: boolean;
  loadingText?: string;
}

export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ className, children, disabled, isLoading, loadingText = 'Loading…', ...props }, ref) => {
    const prefersReducedMotion = usePrefersReducedMotion();
    const isDisabled = disabled || isLoading;

    const motionProps = !prefersReducedMotion && !isDisabled
      ? {
          whileHover: { scale: 1.02, y: -1 },
          whileTap: { scale: 0.98, y: 0 },
          transition: { duration: motionDur.fast / 1000, ease: motionEase.standard },
        }
      : {};

    return (
      <MotionButton
        ref={ref}
        className={cn(
          'motion-safe-only shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          !isDisabled && 'hover:shadow-md',
          className,
        )}
        disabled={isDisabled}
        aria-busy={isLoading || undefined}
        {...motionProps}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2" role="status" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingText}
          </span>
        ) : (
          children
        )}
      </MotionButton>
    );
  },
);

AnimatedButton.displayName = 'AnimatedButton';
