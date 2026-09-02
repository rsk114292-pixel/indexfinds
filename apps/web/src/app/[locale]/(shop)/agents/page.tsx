import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ItemListJsonLd } from '@/components/seo/ItemListJsonLd';
import { AGENT_PLATFORMS } from '@/lib/agent-platforms';
import { defaultGoogleBot, getOgLocale } from '@/lib/seo';
import { buildSiteAlternates, getRequestSiteIdentity } from '@/lib/request-site-identity';
import AgentDirectoryClient from './AgentDirectoryClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'agents' });
  const identity = await getRequestSiteIdentity();
  const { siteUrl, siteName, tenant } = identity;
  const title = t('title');
  const description = t('subtitle', { count: AGENT_PLATFORMS.length });

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/${locale}/agents`,
      siteName,
      type: 'website',
      locale: getOgLocale(locale),
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: buildSiteAlternates(identity, '/agents', locale),
    robots: {
      index: !tenant,
      follow: true,
      googleBot: tenant ? { index: false, follow: true } : defaultGoogleBot,
    },
  };
}

export default async function AgentDirectoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'agents' });
  const { siteUrl } = await getRequestSiteIdentity();
  const items = AGENT_PLATFORMS.map((agent) => ({
    name: agent.name,
    url: `${siteUrl}/${locale}/agents/${agent.key}`,
  }));

  return (
    <>
      <ItemListJsonLd name={t('allGuides')} items={items} />
      <AgentDirectoryClient />
    </>
  );
}
