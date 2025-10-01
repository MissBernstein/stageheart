import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motionDur, motionEase } from './motion';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

export interface AnimatedAccordionItem {
  id: string;
  title: ReactNode;
  content: ReactNode;
  description?: ReactNode;
}

interface AnimatedAccordionProps {
  items: AnimatedAccordionItem[];
  type?: 'single' | 'multiple';
  defaultOpenIds?: string[];
  className?: string;
}

export const AnimatedAccordion = ({ items, type = 'single', defaultOpenIds = [], className }: AnimatedAccordionProps) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [openIds, setOpenIds] = useState<string[]>(defaultOpenIds);
  const hoverLift = prefersReducedMotion ? undefined : { y: -2, scale: 1.01 };

  const isOpen = (id: string) => openIds.includes(id);

  const toggleItem = (id: string) => {
    setOpenIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((itemId) => itemId !== id);
      }
      return type === 'single' ? [id] : [...prev, id];
    });
  };

  return (
    <div className={cn('space-y-2', className)}>
      {items.map(({ id, title, content, description }) => {
        const open = isOpen(id);
        return (
          <div
            key={id}
            className={cn(
              'overflow-hidden rounded-3xl border bg-card/80 backdrop-blur-sm transition-colors',
              open ? 'border-primary/50' : 'border-card-border/60',
            )}
          >
            <motion.button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-expanded={open}
              aria-controls={`${id}-content`}
              onClick={() => toggleItem(id)}
              whileHover={hoverLift}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
              transition={{ duration: motionDur.fast / 1000, ease: motionEase.standard }}
            >
              <div className="flex-1">
                <div className="font-semibold text-card-foreground text-lg">{title}</div>
                {description && (
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mt-2">
                    {description}
                  </div>
                )}
              </div>
              <motion.span
                className="motion-safe-only"
                animate={open ? { rotate: 180 } : { rotate: 0 }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: motionDur.fast / 1000, ease: motionEase.standard }}
              >
                <ChevronDown className="h-4 w-4" />
              </motion.span>
            </motion.button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  id={`${id}-content`}
                  key={id}
                  initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
                  animate={prefersReducedMotion ? { height: 'auto', opacity: 1 } : { height: 'auto', opacity: 1 }}
                  exit={prefersReducedMotion ? { height: 0, opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={prefersReducedMotion ? { duration: 0 } : { duration: motionDur.slow / 1000, ease: motionEase.standard }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 pt-2 text-sm text-card-foreground/90">{content}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};
