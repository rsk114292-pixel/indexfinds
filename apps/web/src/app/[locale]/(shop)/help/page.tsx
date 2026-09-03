import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import HelpPageClient from './HelpPageClient';
import { FAQPageJsonLd } from '@/components/seo/FAQPageJsonLd';
import { defaultGoogleBot, getOgLocale } from '@/lib/seo';
import { buildSiteAlternates, getRequestSiteIdentity } from '@/lib/request-site-identity';

export const dynamic = 'force-dynamic';

const FAQ_CATEGORIES = ['gettingStarted', 'shoppingQc', 'agentsOrders', 'accountSupport'] as const;
const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4'] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const identity = await getRequestSiteIdentity();
  const { siteUrl, siteName, tenant } = identity;
  const title = t('helpTitle');
  const description = t('helpDescription', { siteName });
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/${locale}/help`,
      siteName,
      type: 'website',
      locale: getOgLocale(locale),
    },
    twitter: { card: 'summary', title, description },
    alternates: buildSiteAlternates(identity, '/help', locale),
    robots: {
      index: !tenant,
      follow: true,
      googleBot: tenant ? { index: false, follow: true } : defaultGoogleBot,
    },
  };
}

export default async function HelpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'helpPage' });
  const { siteName } = await getRequestSiteIdentity();

  const faqItems = FAQ_CATEGORIES.flatMap((cat) =>
    FAQ_KEYS.map((key) => ({
      question: t(`categories.${cat}.${key}.question`, { siteName }),
      answer: t(`categories.${cat}.${key}.answer`, { siteName }),
    })),
  );

  return (
    <>
      <FAQPageJsonLd items={faqItems} />
      <HelpPageClient siteName={siteName} />
    </>
  );
}
