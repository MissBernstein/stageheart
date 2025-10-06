import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { fadeInUp } from '@/ui/motion';
import { usePrefersReducedMotion } from '@/ui/usePrefersReducedMotion';
import { MotionIfOkay } from '@/ui/MotionIfOkay';

export interface ModalShellProps {
  titleId: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;           // wrapper panel classes
  contentClassName?: string;    // inner scrolling area classes
  initialFocusRef?: React.RefObject<HTMLElement>;
  ariaLabel?: string;           // use when no visible heading
  backdropClassName?: string;
}

// Focusable selector list derived from WAI-ARIA practices
const FOCUSABLE_SELECTOR = [
  'a[href]','button:not([disabled])','textarea:not([disabled])','input:not([disabled])','select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

export const ModalShell: React.FC<ModalShellProps> = ({
  titleId,
  onClose,
  children,
  className = '',
  contentClassName = '',
  initialFocusRef,
  ariaLabel,
  backdropClassName = ''
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Scroll lock + focus capture + escape + restore focus
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Tab') {
        if (!panelRef.current) return;
        const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
          .filter(el => el.offsetParent !== null);
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKey, true);

    const toFocus = initialFocusRef?.current || panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    toFocus?.focus({ preventScroll: true });

    return () => {
      window.removeEventListener('keydown', handleKey, true);
      document.body.style.overflow = prevOverflow;
      // Restore focus if still in document
      if (previouslyFocused.current && document.contains(previouslyFocused.current)) {
        previouslyFocused.current.focus({ preventScroll: true });
      }
    };
  }, [onClose, initialFocusRef]);

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  return createPortal(
    <MotionIfOkay>
      <motion.div
        ref={overlayRef}
        onMouseDown={handleBackdrop}
        initial={prefersReducedMotion ? false : fadeInUp.initial}
        animate={prefersReducedMotion ? undefined : fadeInUp.animate}
        exit={prefersReducedMotion ? undefined : fadeInUp.exit}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabel ? undefined : titleId}
        aria-label={ariaLabel}
        className={`fixed inset-0 z-[1000] bg-background/95 backdrop-blur-sm overflow-y-auto ${backdropClassName}`}
      >
        <div className="container mx-auto px-4 py-8">
          <div
            ref={panelRef}
            className={`outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-3xl bg-card/95 border border-card-border/70 shadow-card ${className}`}
            tabIndex={-1}
          >
            <div className={contentClassName}>
              {children}
            </div>
          </div>
        </div>
      </motion.div>
    </MotionIfOkay>,
    document.body
  );
};
