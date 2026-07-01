import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import HelpPageClient from './HelpPageClient';
import { FAQPageJsonLd } from '@/components/seo/FAQPageJsonLd';
import { generateAlternates, getOgLocale } from '@/lib/seo';
import { getSiteUrl, getSiteName } from '@/lib/site-config';

const SITE_URL = getSiteUrl();

const FAQ_CATEGORIES = ['gettingStarted', 'shoppingQc', 'agentsOrders', 'accountSupport'] as const;
const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4'] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const title = t('helpTitle');
  const description = t('helpDescription');
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${locale}/help`,
      siteName: getSiteName(),
      type: 'website',
      locale: getOgLocale(locale),
    },
    twitter: { card: 'summary', title, description },
    alternates: generateAlternates('/help', locale),
    robots: { index: true, follow: true },
  };
}

export default async function HelpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'helpPage' });

  const faqItems = FAQ_CATEGORIES.flatMap((cat) =>
    FAQ_KEYS.map((key) => ({
      question: t(`categories.${cat}.${key}.question`),
      answer: t(`categories.${cat}.${key}.answer`),
    })),
  );

  return (
    <>
      <FAQPageJsonLd items={faqItems} />
      <HelpPageClient />
    </>
  );
}
