import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getAgentPlatform } from '@/lib/agent-platforms';
import { defaultGoogleBot, getOgLocale } from '@/lib/seo';
import { buildSiteAlternates, getRequestSiteIdentity } from '@/lib/request-site-identity';
import AgentDetailClient from './AgentDetailClient';

interface AgentPageProps {
  params: Promise<{ locale: string; key: string }>;
}

export async function generateMetadata({
  params,
}: AgentPageProps): Promise<Metadata> {
  const { locale, key } = await params;
  const agent = getAgentPlatform(key);
  if (!agent) return {};
  const t = await getTranslations({ locale, namespace: 'agents' });
  const identity = await getRequestSiteIdentity();
  const { siteUrl, siteName, tenant } = identity;
  const title = t('guideTitle', { name: agent.name });
  const description = t('guideSubtitle', { name: agent.name, siteName });

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/${locale}/agents/${agent.key}`,
      siteName,
      type: 'article',
      locale: getOgLocale(locale),
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: buildSiteAlternates(identity, `/agents/${agent.key}`, locale),
    robots: {
      index: !tenant,
      follow: true,
      googleBot: tenant ? { index: false, follow: true } : defaultGoogleBot,
    },
  };
}

export default async function AgentDetailPage({ params }: AgentPageProps) {
  const { key } = await params;
  const agent = getAgentPlatform(key);
  if (!agent) notFound();
  const { siteName } = await getRequestSiteIdentity();

  return <AgentDetailClient agent={agent} siteName={siteName} />;
}
