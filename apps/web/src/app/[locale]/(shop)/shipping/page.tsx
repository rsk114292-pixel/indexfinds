import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import ShippingPageClient from './ShippingPageClient';
import { generateAlternates, getOgLocale } from '@/lib/seo';
import { getSiteUrl, getSiteName } from '@/lib/site-config';
import { getRequestSiteIdentity } from '@/lib/request-site-identity';
import { getTenantResearchPage } from '@/lib/tenant-research-pages';
import TenantResearchPage, {
  generateMetadata as generateTenantResearchMetadata,
} from '../[platformSlug]/page';

const SITE_URL = getSiteUrl();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const identity = await getRequestSiteIdentity();

  if (identity.tenant && getTenantResearchPage(identity.tenant.domain, 'shipping')) {
    return generateTenantResearchMetadata({
      params: Promise.resolve({ locale, platformSlug: 'shipping' }),
    });
  }

  const t = await getTranslations({ locale, namespace: 'metadata' });

  const title = t('shippingTitle');
  const description = t('shippingDescription');

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${locale}/shipping`,
      siteName: getSiteName(),
      type: 'website',
      locale: getOgLocale(locale),
    },
    twitter: { card: 'summary', title, description },
    alternates: generateAlternates('/shipping', locale),
    robots: { index: true, follow: true },
  };
}

export default async function ShippingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const identity = await getRequestSiteIdentity();

  if (identity.tenant && getTenantResearchPage(identity.tenant.domain, 'shipping')) {
    return TenantResearchPage({
      params: Promise.resolve({ locale, platformSlug: 'shipping' }),
    });
  }

  return <ShippingPageClient />;
}
