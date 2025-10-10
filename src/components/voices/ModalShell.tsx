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
  returnFocusRef?: React.RefObject<HTMLElement>; // explicit element to restore focus to on close
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
  returnFocusRef,
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
    const root = document.getElementById('root');
    const prevAriaHidden = root?.getAttribute('aria-hidden');
    const prevInert = (root as any)?.inert;
    if (root) {
      root.setAttribute('aria-hidden','true');
      (root as any).inert = true;
    }

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
      if (root) {
        if (prevAriaHidden != null) root.setAttribute('aria-hidden', prevAriaHidden); else root.removeAttribute('aria-hidden');
        (root as any).inert = prevInert;
      }
      // Restore focus if still in document
      const restore = returnFocusRef?.current || previouslyFocused.current;
      if (restore && document.contains(restore)) restore.focus({ preventScroll: true });
    };
  }, [onClose, initialFocusRef, returnFocusRef]);

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
        <div className="w-full h-full flex flex-col items-center md:justify-center md:py-12 py-8 px-4">
          <div className="w-full max-w-[1180px]">
            <motion.div
              ref={panelRef}
              tabIndex={-1}
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0, scale: 1, transition: { duration: 0.22, ease: [0.16,0.8,0.24,1] } }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: 8, scale: 0.985, transition: { duration: 0.15 } }}
              className={`outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-3xl bg-card/95 border border-card-border/70 shadow-card mx-auto max-h-[80vh] flex flex-col ${className}`}
            >
              <div className={`overflow-y-auto flex-1 ${contentClassName}`}>
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </MotionIfOkay>,
    document.body
  );
};
