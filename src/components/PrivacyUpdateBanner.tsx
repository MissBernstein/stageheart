import React, { useEffect, useState } from 'react';
import { PRIVACY_VERSION, recordPrivacyAcceptance, needsPrivacyReacceptance } from '@/lib/legal';
import { Link, useLocation } from 'react-router-dom';

export const PrivacyUpdateBanner: React.FC = () => {
  const [show, setShow] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith('/auth') || location.pathname.startsWith('/privacy') || location.pathname.startsWith('/terms')) {
      setShow(false);
      return;
    }
    setShow(needsPrivacyReacceptance());
  }, [location.pathname]);

  if (!show) return null;

  const acceptPrivacy = () => {
  recordPrivacyAcceptance(PRIVACY_VERSION);
    setShow(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Updated Privacy Policy notice"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-xl rounded-2xl border border-border bg-card/90 backdrop-blur px-5 py-4 shadow-lg animate-in slide-in-from-bottom-4"
    >
      <div className="flex flex-col gap-3 text-sm text-card-foreground/90">
        <p className="leading-snug">Our Privacy Policy may have changed. Please review and accept.</p>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/privacy" className="underline underline-offset-2 text-primary hover:text-primary/80 text-xs">Read Privacy Policy</Link>
          <Link to="/terms" className="underline underline-offset-2 text-primary hover:text-primary/80 text-xs">Terms</Link>
          <button
            onClick={acceptPrivacy}
            className="ml-auto text-xs font-medium bg-primary text-primary-foreground rounded-full px-4 py-1.5 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >Accept</button>
          <button
            onClick={() => setShow(false)}
            className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1"
            aria-label="Dismiss privacy notice"
          >Dismiss</button>
        </div>
  <p className="text-[10px] text-muted-foreground">Version: {PRIVACY_VERSION}</p>
      </div>
    </div>
  );
};
