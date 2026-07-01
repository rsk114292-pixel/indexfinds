'use client';

import { useTranslations } from 'next-intl';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

const SECTIONS = [
  { id: 'introduction', title: '' },
  { id: 'service-description', title: '' },
  { id: 'independent-platform', title: '' },
  { id: 'user-accounts', title: '' },
  { id: 'affiliate-links', title: '' },
  { id: 'product-information', title: '' },
  { id: 'qc-photos', title: '' },
  { id: 'intellectual-property', title: '' },
  { id: 'prohibited-conduct', title: '' },
  { id: 'limitation-of-liability', title: '' },
  { id: 'changes-to-terms', title: '' },
  { id: 'contact', title: '' },
];

export default function TermsPageClient() {
  const t = useTranslations('termsPage');

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
      {/* 1. Introduction & Acceptance */}
      <section id="introduction" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.introduction.title')}</h2>
        <p className="text-sm text-muted leading-relaxed">{t('sections.introduction.content')}</p>
      </section>

      {/* 2. Service Description */}
      <section id="service-description" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.service-description.title')}</h2>
        <p className="text-sm text-muted leading-relaxed">{t('sections.service-description.content')}</p>
      </section>

      {/* 3. Independent Platform Disclaimer */}
      <section id="independent-platform" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.independent-platform.title')}</h2>
        <p className="text-sm text-muted leading-relaxed">{t('sections.independent-platform.content')}</p>
      </section>

      {/* 4. User Accounts */}
      <section id="user-accounts" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.user-accounts.title')}</h2>
        <p className="text-sm text-muted leading-relaxed">{t('sections.user-accounts.content')}</p>
      </section>

      {/* 5. Affiliate Links & Revenue */}
      <section id="affiliate-links" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.affiliate-links.title')}</h2>
        <p className="text-sm text-muted leading-relaxed">{t('sections.affiliate-links.content')}</p>
      </section>

      {/* 6. Product Information Accuracy */}
      <section id="product-information" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.product-information.title')}</h2>
        <p className="text-sm text-muted leading-relaxed">{t('sections.product-information.content')}</p>
      </section>

      {/* 7. QC Photos */}
      <section id="qc-photos" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.qc-photos.title')}</h2>
        <p className="text-sm text-muted leading-relaxed">{t('sections.qc-photos.content')}</p>
      </section>

      {/* 8. Intellectual Property */}
      <section id="intellectual-property" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.intellectual-property.title')}</h2>
        <p className="text-sm text-muted leading-relaxed">{t('sections.intellectual-property.content')}</p>
      </section>

      {/* 9. Prohibited Conduct */}
      <section id="prohibited-conduct" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.prohibited-conduct.title')}</h2>
        <p className="text-sm text-muted leading-relaxed mb-3">{t('sections.prohibited-conduct.content')}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted">
          <li>{t('sections.prohibited-conduct.item1')}</li>
          <li>{t('sections.prohibited-conduct.item2')}</li>
          <li>{t('sections.prohibited-conduct.item3')}</li>
          <li>{t('sections.prohibited-conduct.item4')}</li>
          <li>{t('sections.prohibited-conduct.item5')}</li>
        </ul>
      </section>

      {/* 10. Limitation of Liability */}
      <section id="limitation-of-liability" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.limitation-of-liability.title')}</h2>
        <p className="text-sm text-muted leading-relaxed mb-3">{t('sections.limitation-of-liability.content')}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted">
          <li>{t('sections.limitation-of-liability.item1')}</li>
          <li>{t('sections.limitation-of-liability.item2')}</li>
          <li>{t('sections.limitation-of-liability.item3')}</li>
          <li>{t('sections.limitation-of-liability.item4')}</li>
        </ul>
        <p className="text-sm text-muted leading-relaxed mt-3">{t('sections.limitation-of-liability.footer')}</p>
      </section>

      {/* 11. Changes to Terms */}
      <section id="changes-to-terms" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.changes-to-terms.title')}</h2>
        <p className="text-sm text-muted leading-relaxed">{t('sections.changes-to-terms.content')}</p>
      </section>

      {/* 12. Contact Information */}
      <section id="contact" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.contact.title')}</h2>
        <p className="text-sm text-muted leading-relaxed">{t('sections.contact.content')}</p>
      </section>
    </LegalPageLayout>
  );
}
