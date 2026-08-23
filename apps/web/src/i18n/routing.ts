import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale } from './config';

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always',
  // Page metadata owns canonical and hreflang links, including tenant-specific
  // routes that intentionally support fewer locales.
  alternateLinks: false,
  // Disable browser-based auto locale detection so first visit always lands on defaultLocale (/en).
  localeDetection: false,
});
