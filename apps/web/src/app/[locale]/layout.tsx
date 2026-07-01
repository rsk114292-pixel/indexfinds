import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { OrganizationJsonLd } from '@/components/seo';
import { VisitTracker } from '@/components/VisitTracker';
import ConditionalGA from '@/components/ConditionalGA';
import CookieConsent, { CookieConsentProvider } from '@/components/CookieConsent';
import type { Metadata } from 'next';
import { fetchServerApiJson } from '@/lib/server-api-fetch';
import { getSiteUrl, getSiteName } from '@/lib/site-config';
import { getHomeSeoCopy } from '@/lib/home-seo';
import type { TrackingConfig } from '@/lib/tracking-config';

const SITE_URL = getSiteUrl();

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const homeSeo = getHomeSeoCopy(locale);
  // Read pathname forwarded by middleware for hreflang generation
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || `/${locale}`;
  // Strip locale prefix to get the path portion
  const pathWithoutLocale = pathname.replace(/^\/(en|zh|fr|de|es|it|pt|ar)/, '') || '/';

  return {
    title: {
      default: homeSeo.title,
      template: `%s | ${getSiteName()}`,
    },
    description: homeSeo.description,
    icons: {
      icon: [
        { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
        { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      ],
      apple: '/icons/apple-touch-icon.png',
    },
    openGraph: {
      title: homeSeo.ogTitle,
      description: homeSeo.ogDescription,
      url: `${SITE_URL}/${locale}`,
      siteName: getSiteName(),
      type: 'website',
      locale: ({
        en: 'en_US',
        zh: 'zh_CN',
        fr: 'fr_FR',
        de: 'de_DE',
        es: 'es_ES',
        it: 'it_IT',
        pt: 'pt_BR',
        ar: 'ar_SA',
      } as Record<string, string>)[locale] || 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: homeSeo.ogTitle,
      description: homeSeo.ogDescription,
    },
    alternates: {
      canonical: `${SITE_URL}/${locale}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`,
      languages: {
        en: `${SITE_URL}/en${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`,
        zh: `${SITE_URL}/zh${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`,
        fr: `${SITE_URL}/fr${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`,
        de: `${SITE_URL}/de${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`,
        es: `${SITE_URL}/es${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`,
        it: `${SITE_URL}/it${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`,
        pt: `${SITE_URL}/pt${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`,
        ar: `${SITE_URL}/ar${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`,
        'x-default': `${SITE_URL}/en${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`,
      },
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  const homeSeo = getHomeSeoCopy(locale);

  // Validate locale
  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  const messages = await getMessages();
  const trackingConfig = await fetchServerApiJson<TrackingConfig>(
    '/settings/tracking',
    {
      next: { revalidate: 60 },
    },
  );

  return (
    <NextIntlClientProvider messages={messages}>
      <CookieConsentProvider>
        <OrganizationJsonLd description={homeSeo.description} locale={locale} />
        <VisitTracker />
        <ConditionalGA initialConfig={trackingConfig} />
        <CookieConsent />
        {children}
      </CookieConsentProvider>
    </NextIntlClientProvider>
  );
}
