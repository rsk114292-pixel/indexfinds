import { defaultLocale, locales, type Locale } from '@/i18n/config';
import { getSiteName } from '@/lib/site-config';
import ar from '@/i18n/messages/ar.json';
import de from '@/i18n/messages/de.json';
import en from '@/i18n/messages/en.json';
import es from '@/i18n/messages/es.json';
import fr from '@/i18n/messages/fr.json';
import it from '@/i18n/messages/it.json';
import pt from '@/i18n/messages/pt.json';
import zh from '@/i18n/messages/zh.json';

type HomeSeoMessages = {
  metadata: {
    homeTitle: string;
    homeDescription: string;
    homeOgTitle: string;
    homeOgDescription: string;
  };
};

const homeSeoMessagesByLocale = {
  ar,
  de,
  en,
  es,
  fr,
  it,
  pt,
  zh,
} satisfies Record<Locale, HomeSeoMessages>;

export const HOME_KEYWORDS = [
  'Findsindex',
  'spreadsheet finds',
  'weidian finds',
  'kakobuy spreadsheet',
  'cnfans spreadsheet',
  'acbuy spreadsheet',
  'weidian',
  'taobao',
  '1688',
  'QC photos',
] as const;

function normalizeLocale(locale: string): Locale {
  return (locales as readonly string[]).includes(locale)
    ? (locale as Locale)
    : defaultLocale;
}

function injectSiteName(value: string) {
  return value.replaceAll('{siteName}', getSiteName());
}

export function getHomeSeoCopy(locale: string) {
  const safeLocale = normalizeLocale(locale);
  const { metadata } = homeSeoMessagesByLocale[safeLocale];

  return {
    title: injectSiteName(metadata.homeTitle),
    titleSuffix: injectSiteName(metadata.homeTitle).replace(`${getSiteName()} | `, ''),
    description: injectSiteName(metadata.homeDescription),
    ogTitle: injectSiteName(metadata.homeOgTitle),
    ogDescription: injectSiteName(metadata.homeOgDescription),
  };
}

export function getManifestDescription() {
  return injectSiteName(homeSeoMessagesByLocale[defaultLocale].metadata.homeDescription);
}
