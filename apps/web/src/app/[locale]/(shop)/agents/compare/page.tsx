import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { defaultGoogleBot, getOgLocale } from '@/lib/seo';
import { buildSiteAlternates, getRequestSiteIdentity } from '@/lib/request-site-identity';
import CompareAgentsClient from './CompareAgentsClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'agents' });
  const identity = await getRequestSiteIdentity();
  const { siteUrl, siteName, tenant } = identity;
  const title = t('compareTitle');
  const description = t('compareSubtitle');

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/${locale}/agents/compare`,
      siteName,
      type: 'website',
      locale: getOgLocale(locale),
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: buildSiteAlternates(identity, '/agents/compare', locale),
    robots: {
      index: !tenant,
      follow: true,
      googleBot: tenant ? { index: false, follow: true } : defaultGoogleBot,
    },
  };
}

export default async function CompareAgentsPage() {
  const { siteName } = await getRequestSiteIdentity();
  return <CompareAgentsClient siteName={siteName} />;
}
