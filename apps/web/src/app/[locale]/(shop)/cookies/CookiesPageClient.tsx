'use client';

import { useTranslations } from 'next-intl';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

const SECTIONS = [
  { id: 'introduction', title: '' },
  { id: 'essential-cookies', title: '' },
  { id: 'analytics-cookies', title: '' },
  { id: 'marketing-cookies', title: '' },
  { id: 'cookie-management', title: '' },
  { id: 'third-party-cookies', title: '' },
  { id: 'data-retention', title: '' },
  { id: 'your-choices', title: '' },
  { id: 'contact', title: '' },
];

export default function CookiesPageClient() {
  const t = useTranslations('cookiesPage');

  // Populate section titles from translations
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
      {/* 1. Introduction */}
      <section id="introduction" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.introduction.title')}</h2>
        <p className="text-sm text-muted leading-relaxed">{t('sections.introduction.content')}</p>
      </section>

      {/* 2. Essential Cookies */}
      <section id="essential-cookies" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.essential-cookies.title')}</h2>
        <p className="text-sm text-muted leading-relaxed mb-3">{t('sections.essential-cookies.content')}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted">
          <li>{t('sections.essential-cookies.item1')}</li>
          <li>{t('sections.essential-cookies.item2')}</li>
          <li>{t('sections.essential-cookies.item3')}</li>
        </ul>
      </section>

      {/* 3. Analytics Cookies */}
      <section id="analytics-cookies" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.analytics-cookies.title')}</h2>
        <p className="text-sm text-muted leading-relaxed mb-3">{t('sections.analytics-cookies.content')}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted">
          <li>{t('sections.analytics-cookies.item1')}</li>
          <li>{t('sections.analytics-cookies.item2')}</li>
          <li>{t('sections.analytics-cookies.item3')}</li>
        </ul>
      </section>

      {/* 4. Marketing Cookies */}
      <section id="marketing-cookies" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.marketing-cookies.title')}</h2>
        <p className="text-sm text-muted leading-relaxed">{t('sections.marketing-cookies.content')}</p>
      </section>

      {/* 5. Cookie Management */}
      <section id="cookie-management" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.cookie-management.title')}</h2>
        <p className="text-sm text-muted leading-relaxed mb-3">{t('sections.cookie-management.content')}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted">
          <li>{t('sections.cookie-management.item1')}</li>
          <li>{t('sections.cookie-management.item2')}</li>
          <li>{t('sections.cookie-management.item3')}</li>
          <li>{t('sections.cookie-management.item4')}</li>
        </ul>
        <p className="text-sm text-muted leading-relaxed mt-3">{t('sections.cookie-management.footer')}</p>
      </section>

      {/* 6. Third-Party Cookies */}
      <section id="third-party-cookies" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.third-party-cookies.title')}</h2>
        <p className="text-sm text-muted leading-relaxed mb-3">{t('sections.third-party-cookies.content')}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted">
          <li>{t('sections.third-party-cookies.item1')}</li>
          <li>{t('sections.third-party-cookies.item2')}</li>
        </ul>
        <p className="text-sm text-muted leading-relaxed mt-3">{t('sections.third-party-cookies.footer')}</p>
      </section>

      {/* 7. Data Retention */}
      <section id="data-retention" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.data-retention.title')}</h2>
        <p className="text-sm text-muted leading-relaxed mb-3">{t('sections.data-retention.content')}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted">
          <li>{t('sections.data-retention.item1')}</li>
          <li>{t('sections.data-retention.item2')}</li>
          <li>{t('sections.data-retention.item3')}</li>
        </ul>
      </section>

      {/* 8. Your Choices */}
      <section id="your-choices" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.your-choices.title')}</h2>
        <p className="text-sm text-muted leading-relaxed mb-3">{t('sections.your-choices.content')}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted">
          <li>{t('sections.your-choices.item1')}</li>
          <li>{t('sections.your-choices.item2')}</li>
          <li>{t('sections.your-choices.item3')}</li>
          <li>{t('sections.your-choices.item4')}</li>
        </ul>
      </section>

      {/* 9. Contact */}
      <section id="contact" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.contact.title')}</h2>
        <p className="text-sm text-muted leading-relaxed">{t('sections.contact.content')}</p>
      </section>
    </LegalPageLayout>
  );
}
