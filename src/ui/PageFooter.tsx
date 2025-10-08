import React from 'react';
import { cn } from '@/lib/utils';

interface PageFooterProps extends React.HTMLAttributes<HTMLElement> {
  hideLegal?: boolean; // allow hiding links on pages that already emphasize legal content
  compact?: boolean;   // smaller top margin / padding variant
}

export const PageFooter: React.FC<PageFooterProps> = ({ className, hideLegal=false, compact=false, ...rest }) => {
  const year = new Date().getFullYear();
  return (
    <footer
      className={cn(
        'w-full relative z-10',
        compact ? 'mt-6 pb-6 px-4' : 'mt-10 pb-10 px-4',
        className
      )}
      {...rest}
    >
      <div className="w-full max-w-7xl mx-auto flex flex-col items-center gap-3 text-center">
        {!hideLegal && (
          <nav aria-label="Legal" className="w-full flex justify-center">
            <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[11px] text-muted-foreground">
              <li>
                <a href="/terms" className="underline underline-offset-2 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-sm">Terms of Use</a>
              </li>
              <li>
                <a href="/privacy" className="underline underline-offset-2 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-sm">Privacy Policy</a>
              </li>
            </ul>
          </nav>
        )}
        <p className="text-[11px] text-muted-foreground/80">&copy; {year} <span className="font-semibold">Stageheart</span>. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default PageFooter;
