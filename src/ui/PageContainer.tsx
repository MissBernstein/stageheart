import React from 'react';
import { cn } from '@/lib/utils';

/**
 * PageContainer: provides a centered, responsive shell with unified paddings,
 * safe-area awareness (especially bottom on mobile for fab / nav avoidance),
 * and consistent vertical rhythm. Use it to wrap top-level page <main> blocks.
 *
 * Defaults:
 * - Constrains width to a comfortable reading max
 * - Horizontal padding that scales at breakpoints
 * - Top/bottom padding plus safe-area inset compensation
 */
export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Disable the max-width constraint (e.g. for full-bleed dashboards) */
  fluid?: boolean;
  /** Add extra bottom padding (after safe area) when sticky elements overlap */
  extraBottomPadding?: boolean;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  className,
  children,
  fluid = false,
  extraBottomPadding = false,
  ...rest
}) => {
  return (
    <div
      className={cn(
        'w-full mx-auto',
        fluid ? 'max-w-none' : 'max-w-7xl',
        // Base paddings + responsive + safe-area bottom
        'px-4 sm:px-6 lg:px-8 pt-6 pb-20',
        'pb-[calc(env(safe-area-inset-bottom)_+_5rem)]', // ensure space for mobile browser bars
        extraBottomPadding && 'pb-[calc(env(safe-area-inset-bottom)_+_7rem)]',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
};

export default PageContainer;
