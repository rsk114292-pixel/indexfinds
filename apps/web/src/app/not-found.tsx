import { cookies, headers } from 'next/headers';
import NotFoundRecovery from '@/components/NotFoundRecovery';
import { defaultLocale, locales, type Locale } from '@/i18n/config';
import { getFeaturedBrands, getNotFoundMessages } from '@/lib/not-found';

async function getActiveLocale(): Promise<Locale> {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const pathname = headerStore.get('x-pathname') || '';
  const pathLocale = pathname.split('/')[1];

  if (locales.includes(pathLocale as Locale)) {
    return pathLocale as Locale;
  }

  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  if (locales.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }

  return defaultLocale;
}

export default async function NotFound() {
  const locale = await getActiveLocale();
  const [messages, featuredBrands] = await Promise.all([
    getNotFoundMessages(locale),
    getFeaturedBrands(),
  ]);

  return <NotFoundRecovery locale={locale} messages={messages} featuredBrands={featuredBrands} />;
}
