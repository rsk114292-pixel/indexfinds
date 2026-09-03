import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import ContactPageClient from './ContactPageClient';
import { defaultGoogleBot, getOgLocale } from '@/lib/seo';
import { buildSiteAlternates, getRequestSiteIdentity } from '@/lib/request-site-identity';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const identity = await getRequestSiteIdentity();
  const { siteUrl, siteName, tenant } = identity;

  const title = t('contactTitle');
  const description = t('contactDescription', { siteName });

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/${locale}/contact`,
      siteName,
      type: 'website',
      locale: getOgLocale(locale),
    },
    twitter: { card: 'summary', title, description },
    alternates: buildSiteAlternates(identity, '/contact', locale),
    robots: {
      index: !tenant,
      follow: true,
      googleBot: tenant ? { index: false, follow: true } : defaultGoogleBot,
    },
  };
}

export default async function ContactPage() {
  const { siteName } = await getRequestSiteIdentity();
  return <ContactPageClient siteName={siteName} />;
}
