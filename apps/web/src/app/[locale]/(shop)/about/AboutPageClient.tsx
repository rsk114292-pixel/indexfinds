'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

const SECTIONS = [
  { id: 'who-we-are', title: '' },
  { id: 'our-mission', title: '' },
  { id: 'how-it-works', title: '' },
  { id: 'affiliate-disclosure', title: '' },
  { id: 'independence', title: '' },
];

export default function AboutPageClient() {
  const t = useTranslations('aboutPage');

  const sections = SECTIONS.map((s) => ({
    ...s,
    title: t(`sections.${s.id}.title`),
  }));

  return (
    <LegalPageLayout
      title={t('title')}
      lastUpdated="March 1, 2026"
      sections={sections}
    >
      {/* 1. Who We Are */}
      <section id="who-we-are" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.who-we-are.title')}</h2>
        <p className="text-sm text-muted leading-relaxed">{t('sections.who-we-are.content')}</p>
      </section>

      {/* 2. Our Mission */}
      <section id="our-mission" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.our-mission.title')}</h2>
        <p className="text-sm text-muted leading-relaxed">{t('sections.our-mission.content')}</p>
      </section>

      {/* 3. How It Works */}
      <section id="how-it-works" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.how-it-works.title')}</h2>
        <p className="text-sm text-muted leading-relaxed mb-3">{t('sections.how-it-works.content')}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted">
          <li>{t('sections.how-it-works.step1')}</li>
          <li>{t('sections.how-it-works.step2')}</li>
          <li>{t('sections.how-it-works.step3')}</li>
        </ul>
        <p className="text-sm text-muted leading-relaxed mt-3">
          {t('sections.how-it-works.learnMore')}{' '}
          <Link href="/how-it-works" className="text-primary hover:underline">
            {t('sections.how-it-works.learnMoreLink')}
          </Link>
        </p>
      </section>

      {/* 4. Affiliate Disclosure */}
      <section id="affiliate-disclosure" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.affiliate-disclosure.title')}</h2>
        <p className="text-sm text-muted leading-relaxed">{t('sections.affiliate-disclosure.content')}</p>
      </section>

      {/* 5. Independence Disclaimer */}
      <section id="independence" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.independence.title')}</h2>
        <p className="text-sm text-muted leading-relaxed">{t('sections.independence.content')}</p>
      </section>
    </LegalPageLayout>
  );
}
