import { describe, it, expect, beforeEach } from 'vitest';
import { getTermsAcceptance, recordTermsAcceptance, needsTermsReacceptance, TERMS_VERSION, recordPrivacyAcceptance, getPrivacyAcceptance, needsPrivacyReacceptance, PRIVACY_VERSION } from '../src/lib/legal';

// Provide simple localStorage mock if not present
if (typeof localStorage === 'undefined') {
  // @ts-ignore
  global.localStorage = (() => {
    let store: Record<string,string> = {};
    return {
      getItem: (k:string) => store[k] ?? null,
      setItem: (k:string,v:string) => { store[k]=v; },
      removeItem: (k:string) => { delete store[k]; },
      clear: () => { store = {}; }
    };
  })();
}

describe('legal acceptance helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reports reacceptance needed when no record exists', () => {
    expect(getTermsAcceptance()).toBeNull();
    expect(needsTermsReacceptance()).toBe(true);
  });

  it('stores and retrieves terms acceptance record', () => {
    recordTermsAcceptance(TERMS_VERSION);
    const rec = getTermsAcceptance();
    expect(rec).not.toBeNull();
    expect(rec!.version).toBe(TERMS_VERSION);
    expect(needsTermsReacceptance()).toBe(false);
  });

  it('detects version mismatch', () => {
    recordTermsAcceptance('LegacyVersionString');
    expect(needsTermsReacceptance(TERMS_VERSION)).toBe(true);
  });

  it('privacy acceptance mirrors logic', () => {
    expect(getPrivacyAcceptance()).toBeNull();
    expect(needsPrivacyReacceptance()).toBe(true);
    recordPrivacyAcceptance(PRIVACY_VERSION);
    const rec = getPrivacyAcceptance();
    expect(rec).not.toBeNull();
    expect(rec!.version).toBe(PRIVACY_VERSION);
    expect(needsPrivacyReacceptance()).toBe(false);
  });
});
