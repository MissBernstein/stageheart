import React from 'react';
import PageFooter from '@/ui/PageFooter';
import { Link } from 'react-router-dom';
import { LEGAL_CONTACT_EMAIL, TERMS_LAST_UPDATED } from '@/lib/legal';
import { useTranslation } from 'react-i18next';

const sectionCls = 'space-y-3';

export default function Terms() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">{t('legal.termsTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('legal.lastUpdated', { date: TERMS_LAST_UPDATED })}</p>
          <p className="text-sm text-muted-foreground">{t('legal.introTerms')}</p>
          <Link to="/" className="text-primary text-sm underline underline-offset-4">← Back to app</Link>
        </header>

        <div className="prose prose-invert max-w-none">
          <section className={sectionCls}>
            <h2 className="text-xl font-semibold">{t('legal.sections.terms.purposeTitle')}</h2>
            <p>{t('legal.sections.terms.purposeBody')}</p>
          </section>
          <section className={sectionCls}>
            <h2 className="text-xl font-semibold">{t('legal.sections.terms.responsibilityTitle')}</h2>
            <p>{t('legal.sections.terms.responsibilityBody1')}</p>
            <p>{t('legal.sections.terms.responsibilityBody2')}</p>
            <p>{t('legal.sections.terms.responsibilityBody3')}</p>
          </section>
          <section className={sectionCls}>
            <h2 className="text-xl font-semibold">{t('legal.sections.terms.licenseTitle')}</h2>
            <p>{t('legal.sections.terms.licenseBody')}</p>
          </section>
          <section className={sectionCls}>
            <h2 className="text-xl font-semibold">{t('legal.sections.terms.takedownTitle')}</h2>
            <p>{t('legal.sections.terms.takedownBody', { email: LEGAL_CONTACT_EMAIL })}</p>
          </section>
          <section className={sectionCls}>
            <h2 className="text-xl font-semibold">{t('legal.sections.terms.sharingTitle')}</h2>
            <p>{t('legal.sections.terms.sharingBody')}</p>
          </section>
          <section className={sectionCls}>
            <h2 className="text-xl font-semibold">{t('legal.sections.terms.prohibitedTitle')}</h2>
            <p>{t('legal.sections.terms.prohibitedBody')}</p>
          </section>
          <section className={sectionCls}>
            <h2 className="text-xl font-semibold">{t('legal.sections.terms.liabilityTitle')}</h2>
            <p>{t('legal.sections.terms.liabilityBody')}</p>
          </section>
          <section className={sectionCls}>
            <h2 className="text-xl font-semibold">{t('legal.sections.terms.lawTitle')}</h2>
            <p>{t('legal.sections.terms.lawBody')}</p>
          </section>
        </div>

        <div className="pt-6 border-t border-border space-y-3">
          <p className="text-xs text-muted-foreground">Need clarification? Email <span className="font-mono">{LEGAL_CONTACT_EMAIL}</span></p>
          <PageFooter hideLegal compact className="!mt-2 !pb-0" />
        </div>
      </div>
    </div>
  );
}
