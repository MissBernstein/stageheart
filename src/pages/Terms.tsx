import React from 'react';
import PageLayout from '@/ui/PageLayout';
import PageHeader from '@/ui/PageHeader';
import { Link } from 'react-router-dom';
import { LEGAL_CONTACT_EMAIL, TERMS_LAST_UPDATED } from '@/lib/legal';
import { useTranslation } from 'react-i18next';

const sectionCls = 'space-y-3';

export default function Terms() {
  const { t } = useTranslation();
  return (
    <PageLayout className="bg-background" footerProps={{ hideLegal: true }}>
      <div className="max-w-3xl mx-auto space-y-10 px-4 py-10">
        <PageHeader
          title={t('legal.termsTitle')}
          subtitle={t('legal.introTerms')}
          meta={t('legal.lastUpdated', { date: TERMS_LAST_UPDATED })}
          actions={<Link to="/" className="text-primary text-sm underline underline-offset-4">← Back</Link>}
        />

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
        </div>
      </div>
    </PageLayout>
  );
}
