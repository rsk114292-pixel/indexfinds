import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getAgentPlatform } from '@/lib/agent-platforms';
import { generateAlternates, getOgLocale } from '@/lib/seo';
import { getSiteName, getSiteUrl } from '@/lib/site-config';
import AgentDetailClient from './AgentDetailClient';

interface AgentPageProps {
  params: Promise<{ locale: string; key: string }>;
}

const SITE_URL = getSiteUrl();

export async function generateMetadata({
  params,
}: AgentPageProps): Promise<Metadata> {
  const { locale, key } = await params;
  const agent = getAgentPlatform(key);
  if (!agent) return {};
  const t = await getTranslations({ locale, namespace: 'agents' });
  const title = t('guideTitle', { name: agent.name });
  const description = t('guideSubtitle', { name: agent.name });

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${locale}/agents/${agent.key}`,
      siteName: getSiteName(),
      type: 'article',
      locale: getOgLocale(locale),
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: generateAlternates(`/agents/${agent.key}`, locale),
    robots: { index: true, follow: true },
  };
}

export default async function AgentDetailPage({ params }: AgentPageProps) {
  const { key } = await params;
  const agent = getAgentPlatform(key);
  if (!agent) notFound();

  return <AgentDetailClient agent={agent} />;
}
