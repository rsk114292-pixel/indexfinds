'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

const SECTIONS = [
  { id: 'introduction', title: '' },
  { id: 'how-returns-work', title: '' },
  { id: 'qc-photos', title: '' },
  { id: 'refund-process', title: '' },
  { id: 'need-help', title: '' },
];

export default function ReturnsPageClient() {
  const t = useTranslations('returnsPage');

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

      {/* 2. How Returns Work */}
      <section id="how-returns-work" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.how-returns-work.title')}</h2>
        <p className="text-sm text-muted leading-relaxed mb-3">{t('sections.how-returns-work.content')}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted">
          <li>{t('sections.how-returns-work.option1')}</li>
          <li>{t('sections.how-returns-work.option2')}</li>
        </ul>
      </section>

      {/* 3. QC Photos */}
      <section id="qc-photos" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.qc-photos.title')}</h2>
        <p className="text-sm text-muted leading-relaxed">{t('sections.qc-photos.content')}</p>
      </section>

      {/* 4. Refund Process */}
      <section id="refund-process" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.refund-process.title')}</h2>
        <p className="text-sm text-muted leading-relaxed">{t('sections.refund-process.content')}</p>
      </section>

      {/* 5. Need Help? */}
      <section id="need-help" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.need-help.title')}</h2>
        <p className="text-sm text-muted leading-relaxed">
          {t('sections.need-help.content')}{' '}
          <Link href="/help" className="text-primary hover:underline">
            {t('sections.need-help.helpLink')}
          </Link>
        </p>
      </section>
    </LegalPageLayout>
  );
}
