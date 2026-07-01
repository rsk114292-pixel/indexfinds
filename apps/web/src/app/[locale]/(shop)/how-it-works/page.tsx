/**
 * How It Works 页面 - 服务端组件
 * URL: /how-it-works
 *
 * SEO 优化：
 * - 动态 generateMetadata 生成 title, description, Open Graph, hreflang
 * - HowTo JSON-LD 结构化数据（搜索结果显示步骤）
 * - 客户端交互逻辑委托给 HowItWorksPageClient
 */
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import HowItWorksPageClient from './HowItWorksPageClient';
import { HowToJsonLd } from '@/components/seo/HowToJsonLd';
import { generateAlternates, getOgLocale } from '@/lib/seo';
import { getSiteUrl, getSiteName } from '@/lib/site-config';

const SITE_URL = getSiteUrl();

const STEP_KEYS = ['step1', 'step2', 'step3', 'step4'] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });

  const title = t('howItWorksTitle');
  const description = t('howItWorksDescription');

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${locale}/how-it-works`,
      siteName: getSiteName(),
      type: 'website',
      locale: getOgLocale(locale),
    },
    twitter: { card: 'summary', title, description },
    alternates: generateAlternates('/how-it-works', locale),
    robots: { index: true, follow: true },
  };
}

export default async function HowItWorksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'howItWorksPage' });

  const steps = STEP_KEYS.map((key) => ({
    name: t(`steps.${key}.title`),
    text: t(`steps.${key}.description`),
  }));

  return (
    <>
      <HowToJsonLd
        name={t('hero.title')}
        description={t('hero.subtitle')}
        steps={steps}
      />
      <HowItWorksPageClient />
    </>
  );
}
