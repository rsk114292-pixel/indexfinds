import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import VisualSearchPageClient from './VisualSearchPageClient';

const NOINDEX_ROBOTS = {
  index: false,
  follow: true,
  googleBot: {
    index: false,
    follow: true,
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'visualSearch' });

  return {
    title: t('imageSearch'),
    description: t('uploadToSearch'),
    robots: NOINDEX_ROBOTS,
  };
}

export default function VisualSearchPage() {
  return <VisualSearchPageClient />;
}
