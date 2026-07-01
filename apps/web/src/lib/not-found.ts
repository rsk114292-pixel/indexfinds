import { defaultLocale, locales, type Locale } from '@/i18n/config';
import { fetchServerApiJson } from '@/lib/server-api-fetch';
import ar from '@/i18n/messages/ar.json';
import de from '@/i18n/messages/de.json';
import en from '@/i18n/messages/en.json';
import es from '@/i18n/messages/es.json';
import fr from '@/i18n/messages/fr.json';
import it from '@/i18n/messages/it.json';
import pt from '@/i18n/messages/pt.json';
import zh from '@/i18n/messages/zh.json';

type NotFoundMessages = {
  notFound: string;
  notFoundDesc: string;
  backHome: string;
  redirectNotice: string;
  searchTitle: string;
  searchPlaceholder: string;
  searchAction: string;
  popularBrands: string;
};

export type FeaturedBrand = {
  name: string;
  slug: string;
  logoUrl?: string;
};

const errorMessagesByLocale = {
  ar: ar.error,
  de: de.error,
  en: en.error,
  es: es.error,
  fr: fr.error,
  it: it.error,
  pt: pt.error,
  zh: zh.error,
} satisfies Record<Locale, NotFoundMessages>;

export function getNotFoundMessages(locale: string): NotFoundMessages {
  if (locales.includes(locale as Locale)) {
    return errorMessagesByLocale[locale as Locale];
  }

  return errorMessagesByLocale[defaultLocale];
}

export async function getFeaturedBrands(limit = 6): Promise<FeaturedBrand[]> {
  const data = await fetchServerApiJson<{ data?: FeaturedBrand[] }>(
    `/brands?status=active&isFeatured=true&limit=${limit}`,
    { next: { revalidate: 3600 } },
  );
  return (data?.data || []).map((brand: FeaturedBrand) => ({
    name: brand.name,
    slug: brand.slug,
    logoUrl: brand.logoUrl,
  }));
}
