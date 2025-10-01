import { MotionConfig } from 'framer-motion';
import { ReactNode } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

interface MotionIfOkayProps {
  children: ReactNode;
}

export const MotionIfOkay = ({ children }: MotionIfOkayProps) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  return (
    <MotionConfig reducedMotion={prefersReducedMotion ? 'always' : 'never'}>
      {children}
    </MotionConfig>
  );
};
