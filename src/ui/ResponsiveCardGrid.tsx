import React from 'react';
import { cn } from '@/lib/utils';

/**
 * ResponsiveCardGrid abstracts a common pattern of wrapping uniform card items
 * in a responsive auto-fit grid without repeating Tailwind class strings.
 *
 * By default it uses CSS grid auto-fit with a min column width, providing
 * fluid wrapping and avoiding orphaned stretched cards.
 */
export interface ResponsiveCardGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Minimum column width before wrapping (defaults to 240px) */
  minColWidth?: number;
  /** Gap size class (defaults to gap-4) */
  gapClass?: string;
}

export const ResponsiveCardGrid: React.FC<ResponsiveCardGridProps> = ({
  className,
  children,
  minColWidth = 240,
  gapClass = 'gap-4',
  ...rest
}) => {
  return (
    <div
      className={cn('grid', gapClass, className)}
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minColWidth}px, 1fr))` }}
      {...rest}
    >
      {children}
    </div>
  );
};

export default ResponsiveCardGrid;
