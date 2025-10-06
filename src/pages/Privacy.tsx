import React from 'react';
import { Link } from 'react-router-dom';
import { LEGAL_CONTACT_EMAIL, PRIVACY_LAST_UPDATED } from '@/lib/legal';
import { useTranslation } from 'react-i18next';

export default function Privacy() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">{t('legal.privacyTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('legal.lastUpdated', { date: PRIVACY_LAST_UPDATED })}</p>
          <p className="text-sm text-muted-foreground">{t('legal.introPrivacy')}</p>
          <Link to="/" className="text-primary text-sm underline underline-offset-4">← Back to app</Link>
        </header>
        <div className="prose prose-invert max-w-none space-y-6">
          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t('legal.sections.privacy.collectTitle')}</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>{t('legal.sections.privacy.collectList1')}</li>
              <li>{t('legal.sections.privacy.collectList2')}</li>
              <li>{t('legal.sections.privacy.collectList3')}</li>
              <li>{t('legal.sections.privacy.collectList4')}</li>
            </ul>
          </section>
          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t('legal.sections.privacy.notCollectTitle')}</h2>
            <p className="text-sm">{t('legal.sections.privacy.notCollectBody')}</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t('legal.sections.privacy.retentionTitle')}</h2>
            <p className="text-sm">{t('legal.sections.privacy.retentionBody')}</p>
          </section>
            <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t('legal.sections.privacy.securityTitle')}</h2>
            <p className="text-sm">{t('legal.sections.privacy.securityBody')}</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t('legal.sections.privacy.choicesTitle')}</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>{t('legal.sections.privacy.choicesList1')}</li>
              <li>{t('legal.sections.privacy.choicesList2')}</li>
              <li>{t('legal.sections.privacy.choicesList3')}</li>
            </ul>
          </section>
          <section className="space-y-2">
            <h2 className="text-xl font-semibold">{t('legal.sections.privacy.contactTitle')}</h2>
            <p className="text-sm">{t('legal.sections.privacy.contactBody', { email: LEGAL_CONTACT_EMAIL })}</p>
          </section>
        </div>
        <footer className="pt-6 border-t border-border text-xs text-muted-foreground flex flex-col gap-2">
          <p>&copy; {new Date().getFullYear()} Stageheart</p>
        </footer>
      </div>
    </div>
  );
}
