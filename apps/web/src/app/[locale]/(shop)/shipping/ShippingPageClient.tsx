'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

const SECTIONS = [
  { id: 'introduction', title: '' },
  { id: 'how-shipping-works', title: '' },
  { id: 'shipping-methods', title: '' },
  { id: 'shipping-tips', title: '' },
  { id: 'need-help', title: '' },
];

export default function ShippingPageClient() {
  const t = useTranslations('shippingPage');

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

      {/* 2. How Shipping Works */}
      <section id="how-shipping-works" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.how-shipping-works.title')}</h2>
        <p className="text-sm text-muted leading-relaxed mb-3">{t('sections.how-shipping-works.content')}</p>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted">
          <li>{t('sections.how-shipping-works.step1')}</li>
          <li>{t('sections.how-shipping-works.step2')}</li>
          <li>{t('sections.how-shipping-works.step3')}</li>
          <li>{t('sections.how-shipping-works.step4')}</li>
        </ol>
      </section>

      {/* 3. Shipping Methods */}
      <section id="shipping-methods" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.shipping-methods.title')}</h2>
        <p className="text-sm text-muted leading-relaxed mb-3">{t('sections.shipping-methods.content')}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted">
          <li>{t('sections.shipping-methods.method1')}</li>
          <li>{t('sections.shipping-methods.method2')}</li>
          <li>{t('sections.shipping-methods.method3')}</li>
          <li>{t('sections.shipping-methods.method4')}</li>
        </ul>
      </section>

      {/* 4. Shipping Tips */}
      <section id="shipping-tips" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.shipping-tips.title')}</h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted">
          <li>{t('sections.shipping-tips.tip1')}</li>
          <li>{t('sections.shipping-tips.tip2')}</li>
          <li>{t('sections.shipping-tips.tip3')}</li>
          <li>{t('sections.shipping-tips.tip4')}</li>
        </ul>
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
