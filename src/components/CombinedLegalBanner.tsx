import React, { useEffect, useState } from 'react';
import { needsTermsReacceptance, needsPrivacyReacceptance, TERMS_VERSION, PRIVACY_VERSION, recordTermsAcceptance, recordPrivacyAcceptance } from '@/lib/legal';
import { Link, useLocation } from 'react-router-dom';

export const CombinedLegalBanner: React.FC = () => {
  const [needsTerms, setNeedsTerms] = useState(false);
  const [needsPrivacy, setNeedsPrivacy] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (['/auth','/terms','/privacy'].some(p => location.pathname.startsWith(p))) {
      setNeedsTerms(false); setNeedsPrivacy(false); return;
    }
    setNeedsTerms(needsTermsReacceptance());
    setNeedsPrivacy(needsPrivacyReacceptance());
  }, [location.pathname]);

  const show = needsTerms || needsPrivacy;
  if (!show) return null;

  const accept = () => {
    if (needsTerms) recordTermsAcceptance(TERMS_VERSION);
    if (needsPrivacy) recordPrivacyAcceptance(PRIVACY_VERSION);
    setNeedsTerms(false); setNeedsPrivacy(false);
  };

  const message = needsTerms && needsPrivacy
    ? 'Our Terms of Use and Privacy Policy have changed. Please review and accept.'
    : needsTerms ? 'Our Terms of Use have changed.' : 'Our Privacy Policy has changed.';

  return (
    <div role="dialog" aria-label="Legal update notice" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl rounded-2xl border border-border bg-card/90 backdrop-blur px-5 py-4 shadow-lg animate-in slide-in-from-bottom-4">
      <div className="flex flex-col gap-3 text-sm text-card-foreground/90">
        <p className="leading-snug">{message}</p>
        <div className="flex flex-wrap items-center gap-3">
          {(needsTerms || needsPrivacy) && (
            <>
              <Link to="/terms" className="underline underline-offset-2 text-primary hover:text-primary/80 text-xs">Terms</Link>
              <Link to="/privacy" className="underline underline-offset-2 text-primary hover:text-primary/80 text-xs">Privacy</Link>
            </>
          )}
          <button onClick={accept} className="ml-auto text-xs font-medium bg-primary text-primary-foreground rounded-full px-4 py-1.5 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50">Accept</button>
          <button onClick={() => { setNeedsTerms(false); setNeedsPrivacy(false); }} className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1">Dismiss</button>
        </div>
        <p className="text-[10px] text-muted-foreground">T:{TERMS_VERSION} • P:{PRIVACY_VERSION}</p>
      </div>
    </div>
  );
};
