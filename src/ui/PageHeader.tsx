import React from 'react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps extends React.HTMLAttributes<HTMLElement> {
  /** Main title text (if you don't pass children for custom composition) */
  title?: string;
  /** Optional subtitle or supporting line */
  subtitle?: React.ReactNode;
  /** Optional meta / small line underneath subtitle (e.g., last updated) */
  meta?: React.ReactNode;
  /** Custom heading element tag (h1-h6). Default h1. */
  as?: keyof JSX.IntrinsicElements;
  /** Right-aligned actions (buttons, etc.) */
  actions?: React.ReactNode;
  /** Center content (default false) */
  center?: boolean;
  /** Reduce bottom spacing (compact variant) */
  compact?: boolean;
}

/**
 * PageHeader standardizes heading scale & vertical rhythm.
 * Default spacing: responsive margin bottom and consistent gap stacking.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  meta,
  as = 'h1',
  actions,
  center = false,
  compact = false,
  className,
  children,
  ...rest
}) => {
  const HeadingTag = as as any;
  const hasCustom = !!children;
  return (
    <header
      className={cn(
        'w-full',
        center && 'text-center',
        compact ? 'mb-4' : 'mb-8',
        className
      )}
      {...rest}
    >
      <div className={cn('flex flex-col gap-4', center ? 'items-center' : 'items-start', actions && !center && 'md:flex-row md:items-end md:justify-between md:gap-8')}>        
        <div className={cn('space-y-3', center && 'flex flex-col items-center')}>          
          {hasCustom ? children : (
            <>
              {title && (
                <HeadingTag className="font-bold leading-tight tracking-tight text-[24px]" style={{ fontFamily: '"Love Ya Like A Sister"' }}>
                  {title}
                </HeadingTag>
              )}
              {subtitle && (
                <p className="text-sm text-muted-foreground max-w-prose">{subtitle}</p>
              )}
              {meta && (
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">{meta}</p>
              )}
            </>
          )}
        </div>
        {actions && (
          <div className={cn('flex-shrink-0 flex items-center gap-2', center && 'mt-2')}>{actions}</div>
        )}
      </div>
    </header>
  );
};

export default PageHeader;
