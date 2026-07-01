'use client';

import { useTranslations } from 'next-intl';

export function SkipToContent() {
  const t = useTranslations('common');
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:bg-white focus:text-foreground focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary"
    >
      {t('skipToContent')}
    </a>
  );
}
