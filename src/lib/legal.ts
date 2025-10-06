import { termsSections, privacySections, TERMS_LAST_UPDATED, PRIVACY_LAST_UPDATED } from './legalContent';

export const LEGAL_CONTACT_EMAIL = 'legal@stageheart.app';

// LocalStorage key for recording acceptance (simple client-side record; server enforcement can be added later)
export const LS_TERMS_ACCEPTANCE_KEY = 'stageheart_terms_acceptance_v1';
export const LS_PRIVACY_ACCEPTANCE_KEY = 'stageheart_privacy_acceptance_v1';

// Simple hash (djb2) of section content to generate version identifiers
function hashSections(sections: { title: string; paragraphs: string[] }[]): string {
  let hash = 5381;
  for (const s of sections) {
    const full = s.title + '|' + s.paragraphs.join('||');
    for (let i = 0; i < full.length; i++) {
      hash = ((hash << 5) + hash) + full.charCodeAt(i); // hash * 33 + c
      hash = hash >>> 0;
    }
  }
  return hash.toString(16);
}

export const TERMS_VERSION = `${TERMS_LAST_UPDATED}-${hashSections(termsSections)}`;
export const PRIVACY_VERSION = `${PRIVACY_LAST_UPDATED}-${hashSections(privacySections)}`;

export interface TermsAcceptanceRecord {
  acceptedAt: string; // ISO timestamp
  version: string; // could be a hash or date string
}

async function syncServer(kind: 'terms' | 'privacy', version: string) {
  try {
    // Dynamic import to avoid cost if unused
    const mod = await import('@/integrations/supabase/client');
  const supabase: any = mod.supabase;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    // If table doesn't exist yet, this will fail silently (early-stage feature)
    try {
      await supabase.from('user_legal_consents').upsert({
        user_id: session.user.id,
        [`${kind}_version`]: version,
        [`${kind}_accepted_at`]: new Date().toISOString()
      }, { onConflict: 'user_id' });
    } catch { /* ignore */ }
  } catch { /* ignore */ }
}

export function recordTermsAcceptance(version: string) {
  const rec: TermsAcceptanceRecord = { acceptedAt: new Date().toISOString(), version };
  try { localStorage.setItem(LS_TERMS_ACCEPTANCE_KEY, JSON.stringify(rec)); } catch {/* ignore */}
  // Fire and forget server sync
  syncServer('terms', version);
}

export function getTermsAcceptance(): TermsAcceptanceRecord | null {
  try {
    const raw = localStorage.getItem(LS_TERMS_ACCEPTANCE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
 }

// Returns true if user must (re)accept current terms version
export function needsTermsReacceptance(currentVersion: string = TERMS_VERSION): boolean {
  const rec = getTermsAcceptance();
  if (!rec) return true; // never accepted
  if (rec.version === TERMS_LAST_UPDATED && currentVersion.startsWith(TERMS_LAST_UPDATED)) {
    // Auto-upgrade legacy date-only record
    recordTermsAcceptance(currentVersion);
    return false;
  }
  return rec.version !== currentVersion;
}

// Privacy acceptance (mirrors terms logic)
export function recordPrivacyAcceptance(version: string) {
  const rec: TermsAcceptanceRecord = { acceptedAt: new Date().toISOString(), version };
  try { localStorage.setItem(LS_PRIVACY_ACCEPTANCE_KEY, JSON.stringify(rec)); } catch {/* ignore */}
  syncServer('privacy', version);
}

export function getPrivacyAcceptance(): TermsAcceptanceRecord | null {
  try {
    const raw = localStorage.getItem(LS_PRIVACY_ACCEPTANCE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function needsPrivacyReacceptance(currentVersion: string = PRIVACY_VERSION): boolean {
  const rec = getPrivacyAcceptance();
  if (!rec) return true;
  if (rec.version === PRIVACY_LAST_UPDATED && currentVersion.startsWith(PRIVACY_LAST_UPDATED)) {
    recordPrivacyAcceptance(currentVersion);
    return false;
  }
  return rec.version !== currentVersion;
}

export { termsSections, privacySections, TERMS_LAST_UPDATED, PRIVACY_LAST_UPDATED };



