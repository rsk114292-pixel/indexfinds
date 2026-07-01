'use client';

import { useTranslations } from 'next-intl';
import { getContactEmail, getPrivacyEmail } from '@/lib/site-config';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

const SECTIONS = [
  { id: 'get-in-touch', title: '' },
  { id: 'email', title: '' },
  { id: 'community', title: '' },
  { id: 'important-note', title: '' },
];

export default function ContactPageClient() {
  const t = useTranslations('contactPage');

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
      {/* 1. Get In Touch */}
      <section id="get-in-touch" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.get-in-touch.title')}</h2>
        <p className="text-sm text-muted leading-relaxed">{t('sections.get-in-touch.content')}</p>
      </section>

      {/* 2. Email */}
      <section id="email" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.email.title')}</h2>
        <ul className="space-y-3 text-sm text-muted">
          <li>
            <span className="font-medium text-foreground">{t('sections.email.generalLabel')}</span>{' '}
            <a href={`mailto:${getContactEmail()}`} className="text-primary hover:underline">{getContactEmail()}</a>
            <span className="text-muted"> — {t('sections.email.generalDesc')}</span>
          </li>
          <li>
            <span className="font-medium text-foreground">{t('sections.email.privacyLabel')}</span>{' '}
            <a href={`mailto:${getPrivacyEmail()}`} className="text-primary hover:underline">{getPrivacyEmail()}</a>
            <span className="text-muted"> — {t('sections.email.privacyDesc')}</span>
          </li>
        </ul>
      </section>

      {/* 3. Community */}
      <section id="community" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.community.title')}</h2>
        <p className="text-sm text-muted leading-relaxed mb-3">{t('sections.community.content')}</p>
        <ul className="space-y-2 text-sm text-muted">
          <li>
            <a href="#" className="text-primary hover:underline">Discord</a> — {t('sections.community.discord')}
          </li>
          <li>
            <a href="#" className="text-primary hover:underline">Telegram</a> — {t('sections.community.telegram')}
          </li>
        </ul>
      </section>

      {/* 4. Important Note */}
      <section id="important-note" className="scroll-mt-24 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('sections.important-note.title')}</h2>
        <p className="text-sm text-muted leading-relaxed">{t('sections.important-note.content')}</p>
      </section>
    </LegalPageLayout>
  );
}
