export const locales = ['en', 'zh', 'fr', 'de', 'es', 'it', 'pt', 'ar'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

const RTL_LOCALES: Locale[] = ['ar'];
export function isRTL(locale: Locale | string): boolean {
  return RTL_LOCALES.includes(locale as Locale);
}
