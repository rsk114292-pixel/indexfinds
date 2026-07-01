'use client';

import { useTranslations } from 'next-intl';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

const SECTIONS = [
  { id: 'introduction', title: '' },
  { id: 'data-we-collect', title: '' },
  { id: 'how-we-use', title: '' },
  { id: 'cookies', title: '' },
  { id: 'third-party-services', title: '' },
  { id: 'data-sharing', title: '' },
  { id: 'international-transfers', title: '' },
  { id: 'data-retention', title: '' },
  { id: 'your-rights', title: '' },
  { id: 'security', title: '' },
  { id: 'changes-to-policy', title: '' },
  { id: 'contact', title: '' },
];

export default function PrivacyPageClient() {
  const t = useTranslations('privacyPage');

  // Populate section titles from translations
  const sections = SECTIONS.map((s) => ({
    ...s,
    title: t(`sections.${s.id}.title`),
  }));

  return (
    <LegalPageLayout
      title={t('title')}
      lastUpdated="February 28, 2026"
      sections={sections}
    >
      {/* 1. Introduction */}
      <section id="introduction" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.introduction.title')}</h2>
        <p className="text-sm text-muted leading-relaxed">{t('sections.introduction.content')}</p>
      </section>

      {/* 2. Data We Collect */}
      <section id="data-we-collect" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.data-we-collect.title')}</h2>
        <h3 className="text-base font-medium text-foreground mt-4 mb-2">{t('sections.data-we-collect.providedTitle')}</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted">
          <li>{t('sections.data-we-collect.provided1')}</li>
          <li>{t('sections.data-we-collect.provided2')}</li>
          <li>{t('sections.data-we-collect.provided3')}</li>
          <li>{t('sections.data-we-collect.provided4')}</li>
        </ul>
        <h3 className="text-base font-medium text-foreground mt-4 mb-2">{t('sections.data-we-collect.autoTitle')}</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted">
          <li>{t('sections.data-we-collect.auto1')}</li>
          <li>{t('sections.data-we-collect.auto2')}</li>
          <li>{t('sections.data-we-collect.auto3')}</li>
          <li>{t('sections.data-we-collect.auto4')}</li>
          <li>{t('sections.data-we-collect.auto5')}</li>
          <li>{t('sections.data-we-collect.auto6')}</li>
        </ul>
      </section>

      {/* 3. How We Use Your Data */}
      <section id="how-we-use" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.how-we-use.title')}</h2>
        <p className="text-sm text-muted leading-relaxed mb-3">{t('sections.how-we-use.content')}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted">
          <li>{t('sections.how-we-use.item1')}</li>
          <li>{t('sections.how-we-use.item2')}</li>
          <li>{t('sections.how-we-use.item3')}</li>
          <li>{t('sections.how-we-use.item4')}</li>
          <li>{t('sections.how-we-use.item5')}</li>
          <li>{t('sections.how-we-use.item6')}</li>
        </ul>
      </section>

      {/* 4. Cookies */}
      <section id="cookies" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.cookies.title')}</h2>
        <p className="text-sm text-muted leading-relaxed mb-3">{t('sections.cookies.content')}</p>
        <h3 className="text-base font-medium text-foreground mt-4 mb-2">{t('sections.cookies.essentialTitle')}</h3>
        <p className="text-sm text-muted leading-relaxed">{t('sections.cookies.essentialContent')}</p>
        <h3 className="text-base font-medium text-foreground mt-4 mb-2">{t('sections.cookies.analyticsTitle')}</h3>
        <p className="text-sm text-muted leading-relaxed">{t('sections.cookies.analyticsContent')}</p>
        <p className="text-sm text-muted leading-relaxed mt-3">{t('sections.cookies.footer')}</p>
      </section>

      {/* 5. Third-Party Services */}
      <section id="third-party-services" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.third-party-services.title')}</h2>
        <p className="text-sm text-muted leading-relaxed mb-3">{t('sections.third-party-services.content')}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted">
          <li>{t('sections.third-party-services.item1')}</li>
          <li>{t('sections.third-party-services.item2')}</li>
        </ul>
        <p className="text-sm text-muted leading-relaxed mt-3">{t('sections.third-party-services.footer')}</p>
      </section>

      {/* 6. Data Sharing */}
      <section id="data-sharing" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.data-sharing.title')}</h2>
        <p className="text-sm text-muted leading-relaxed mb-3">{t('sections.data-sharing.content')}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted">
          <li>{t('sections.data-sharing.item1')}</li>
          <li>{t('sections.data-sharing.item2')}</li>
        </ul>
        <p className="text-sm text-muted leading-relaxed mt-3">{t('sections.data-sharing.footer')}</p>
      </section>

      {/* 7. International Data Transfers */}
      <section id="international-transfers" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.international-transfers.title')}</h2>
        <p className="text-sm text-muted leading-relaxed">{t('sections.international-transfers.content')}</p>
      </section>

      {/* 8. Data Retention */}
      <section id="data-retention" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.data-retention.title')}</h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted">
          <li>{t('sections.data-retention.item1')}</li>
          <li>{t('sections.data-retention.item2')}</li>
          <li>{t('sections.data-retention.item3')}</li>
        </ul>
      </section>

      {/* 9. Your Rights (GDPR) */}
      <section id="your-rights" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.your-rights.title')}</h2>
        <p className="text-sm text-muted leading-relaxed mb-3">{t('sections.your-rights.content')}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted">
          <li>{t('sections.your-rights.item1')}</li>
          <li>{t('sections.your-rights.item2')}</li>
          <li>{t('sections.your-rights.item3')}</li>
          <li>{t('sections.your-rights.item4')}</li>
          <li>{t('sections.your-rights.item5')}</li>
          <li>{t('sections.your-rights.item6')}</li>
        </ul>
        <p className="text-sm text-muted leading-relaxed mt-3">{t('sections.your-rights.footer')}</p>
      </section>

      {/* 10. Security */}
      <section id="security" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.security.title')}</h2>
        <p className="text-sm text-muted leading-relaxed mb-3">{t('sections.security.content')}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted">
          <li>{t('sections.security.item1')}</li>
          <li>{t('sections.security.item2')}</li>
          <li>{t('sections.security.item3')}</li>
          <li>{t('sections.security.item4')}</li>
        </ul>
        <p className="text-sm text-muted leading-relaxed mt-3">{t('sections.security.footer')}</p>
      </section>

      {/* 11. Changes to This Policy */}
      <section id="changes-to-policy" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.changes-to-policy.title')}</h2>
        <p className="text-sm text-muted leading-relaxed">{t('sections.changes-to-policy.content')}</p>
      </section>

      {/* 12. Contact Us */}
      <section id="contact" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.contact.title')}</h2>
        <p className="text-sm text-muted leading-relaxed">{t('sections.contact.content')}</p>
      </section>
    </LegalPageLayout>
  );
}
