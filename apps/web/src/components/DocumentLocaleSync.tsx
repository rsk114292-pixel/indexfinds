'use client';

import { useEffect } from 'react';
import { isRTL, type Locale } from '@/i18n/config';

interface DocumentLocaleSyncProps {
  locale: Locale;
}

export default function DocumentLocaleSync({ locale }: DocumentLocaleSyncProps) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRTL(locale) ? 'rtl' : 'ltr';
  }, [locale]);

  return null;
}
