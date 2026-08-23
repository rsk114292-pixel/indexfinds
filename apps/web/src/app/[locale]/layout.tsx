import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { OrganizationJsonLd } from '@/components/seo';
import { VisitTracker } from '@/components/VisitTracker';
import ConditionalGA from '@/components/ConditionalGA';
import CookieConsent, { CookieConsentProvider } from '@/components/CookieConsent';
import WhatsAppHelp from '@/components/WhatsAppHelp';
import type { Metadata } from 'next';
import { fetchServerApiJson } from '@/lib/server-api-fetch';
import { getSiteUrl, getSiteName } from '@/lib/site-config';
import { getHomeSeoCopy } from '@/lib/home-seo';
import type { TrackingConfig } from '@/lib/tracking-config';
import DocumentLocaleSync from '@/components/DocumentLocaleSync';
import type { Locale } from '@/i18n/config';
import { resolveTenantFromHeaders } from '@/lib/tenant-config';

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
  const localTenantHost = process.env.INDEXFINDS_LOCAL_TENANT_HOST;
  const tenant = resolveTenantFromHeaders(headersList, localTenantHost);
  const branding = tenant?.branding;
  const siteUrl = tenant?.canonicalOrigin || SITE_URL;
  const siteName = branding?.siteName || getSiteName();
  const pageTitle = branding?.seoTitle || homeSeo.title;
  const pageDescription = branding?.description || homeSeo.description;
  const pathname = headersList.get('x-pathname') || `/${locale}`;
  // Strip locale prefix to get the path portion
  const pathWithoutLocale = pathname.replace(/^\/(en|zh|fr|de|es|it|pt|ar)/, '') || '/';

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: pageTitle,
      template: `%s | ${siteName}`,
    },
    description: pageDescription,
    icons: {
      icon: branding
        ? [{ url: branding.faviconPath, sizes: 'any', type: 'image/svg+xml' }]
        : [
            { url: '/favicon.ico', sizes: 'any' },
            { url: '/icons/logo.svg', sizes: 'any', type: 'image/svg+xml' },
            { url: '/icons/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
            { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
            { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
          ],
      shortcut: branding?.faviconPath || '/favicon.ico',
      apple: branding?.logoPath || '/icons/apple-touch-icon.png',
    },
    openGraph: {
      title: branding?.seoTitle || homeSeo.ogTitle,
      description: branding?.description || homeSeo.ogDescription,
      url: `${siteUrl}/${locale}`,
      siteName,
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
      title: branding?.seoTitle || homeSeo.ogTitle,
      description: branding?.description || homeSeo.ogDescription,
    },
    alternates: {
      canonical: `${siteUrl}/${locale}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`,
      languages: {
        en: `${siteUrl}/en${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`,
        zh: `${siteUrl}/zh${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`,
        fr: `${siteUrl}/fr${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`,
        de: `${siteUrl}/de${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`,
        es: `${siteUrl}/es${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`,
        it: `${siteUrl}/it${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`,
        pt: `${siteUrl}/pt${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`,
        ar: `${siteUrl}/ar${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`,
        'x-default': `${siteUrl}/en${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`,
      },
    },
    robots:
      branding?.indexing === 'draft'
        ? { index: false, follow: true }
        : undefined,
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  const homeSeo = getHomeSeoCopy(locale);
  const headersList = await headers();
  const localTenantHost = process.env.INDEXFINDS_LOCAL_TENANT_HOST;
  const tenant = resolveTenantFromHeaders(headersList, localTenantHost);
  const branding = tenant?.branding;

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
      <DocumentLocaleSync locale={locale as Locale} />
      <CookieConsentProvider>
        <OrganizationJsonLd
          description={branding?.description || homeSeo.description}
          locale={locale}
          baseUrl={tenant?.canonicalOrigin}
          siteName={branding?.siteName}
          logoPath={branding?.logoPath}
        />
        <VisitTracker />
        <ConditionalGA initialConfig={trackingConfig} />
        <CookieConsent />
        <WhatsAppHelp />
        {children}
      </CookieConsentProvider>
    </NextIntlClientProvider>
  );
}
