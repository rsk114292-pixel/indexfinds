import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale } from './config';

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always',
  // Disable browser-based auto locale detection so first visit always lands on defaultLocale (/en).
  localeDetection: false,
});
