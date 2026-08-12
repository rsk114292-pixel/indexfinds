import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { generateAlternates, getOgLocale } from '@/lib/seo';
import { getSiteName, getSiteUrl } from '@/lib/site-config';
import CompareAgentsClient from './CompareAgentsClient';

const SITE_URL = getSiteUrl();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'agents' });
  const title = t('compareTitle');
  const description = t('compareSubtitle');

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${locale}/agents/compare`,
      siteName: getSiteName(),
      type: 'website',
      locale: getOgLocale(locale),
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: generateAlternates('/agents/compare', locale),
    robots: { index: true, follow: true },
  };
}

export default function CompareAgentsPage() {
  return <CompareAgentsClient />;
}
