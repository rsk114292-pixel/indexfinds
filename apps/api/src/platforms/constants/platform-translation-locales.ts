export const PLATFORM_TRANSLATION_LOCALES = [
  'en',
  'zh',
  'fr',
  'de',
  'es',
  'it',
  'pt',
  'ar',
] as const;

export type PlatformTranslationLocale =
  (typeof PLATFORM_TRANSLATION_LOCALES)[number];

export const PLATFORM_TRANSLATION_LOCALE_SET = new Set<string>(
  PLATFORM_TRANSLATION_LOCALES,
);
