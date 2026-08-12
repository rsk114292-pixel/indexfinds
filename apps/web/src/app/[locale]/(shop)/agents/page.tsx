import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ItemListJsonLd } from '@/components/seo/ItemListJsonLd';
import { AGENT_PLATFORMS } from '@/lib/agent-platforms';
import { generateAlternates, getOgLocale } from '@/lib/seo';
import { getSiteName, getSiteUrl } from '@/lib/site-config';
import AgentDirectoryClient from './AgentDirectoryClient';

const SITE_URL = getSiteUrl();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'agents' });
  const title = t('title');
  const description = t('subtitle', { count: AGENT_PLATFORMS.length });

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${locale}/agents`,
      siteName: getSiteName(),
      type: 'website',
      locale: getOgLocale(locale),
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: generateAlternates('/agents', locale),
    robots: { index: true, follow: true },
  };
}

export default async function AgentDirectoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'agents' });
  const items = AGENT_PLATFORMS.map((agent) => ({
    name: agent.name,
    url: `${SITE_URL}/${locale}/agents/${agent.key}`,
  }));

  return (
    <>
      <ItemListJsonLd name={t('allGuides')} items={items} />
      <AgentDirectoryClient />
    </>
  );
}
