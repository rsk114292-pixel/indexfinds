import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import ReturnsPageClient from './ReturnsPageClient';
import { generateAlternates, getOgLocale } from '@/lib/seo';
import { getSiteUrl, getSiteName } from '@/lib/site-config';

const SITE_URL = getSiteUrl();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });

  const title = t('returnsTitle');
  const description = t('returnsDescription');

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${locale}/returns`,
      siteName: getSiteName(),
      type: 'website',
      locale: getOgLocale(locale),
    },
    twitter: { card: 'summary', title, description },
    alternates: generateAlternates('/returns', locale),
    robots: { index: true, follow: true },
  };
}

export default function ReturnsPage() {
  return <ReturnsPageClient />;
}
