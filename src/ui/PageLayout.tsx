import React from 'react';
import { cn } from '@/lib/utils';
import PageFooter from '@/ui/PageFooter';
import { PageContainer } from '@/ui';

export interface PageLayoutProps {
  children: React.ReactNode;
  /** Wrap children in a PageContainer (default true) */
  container?: boolean;
  /** Render footer (default true) */
  footer?: boolean;
  /** Props forwarded to PageFooter */
  footerProps?: React.ComponentProps<typeof PageFooter>;
  /** Make container fluid (remove max width) */
  fluid?: boolean;
  className?: string;        // outer wrapper
  mainClassName?: string;    // main element className
  containerClassName?: string; // additional classes for PageContainer
}

/**
 * PageLayout standardizes vertical structure: full-height flex column,
 * optional PageContainer wrapping content, and a consistent footer.
 * It reduces repetitive boilerplate across simple content pages.
 */
export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  container = true,
  footer = true,
  footerProps,
  fluid = false,
  className,
  mainClassName,
  containerClassName
}) => {
  const content = container ? (
    <PageContainer fluid={fluid} className={containerClassName}>{children}</PageContainer>
  ) : (
    <>{children}</>
  );

  return (
    <div className={cn('min-h-screen flex flex-col bg-background', className)}>
      <main className={cn('flex-1 flex flex-col', mainClassName)}>
        {content}
      </main>
      {footer && <PageFooter {...footerProps} />}
    </div>
  );
};

export default PageLayout;
