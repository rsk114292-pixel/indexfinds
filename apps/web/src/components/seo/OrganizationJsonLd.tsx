/**
 * Organization + Website JSON-LD 结构化数据组件
 * 用于全站级别的组织信息和站点搜索框
 *
 * 放置在 layout.tsx 中，每个页面都会包含
 */

import { getSiteUrl, getSiteName } from '@/lib/site-config';

type OrganizationJsonLdProps = {
  description: string;
  locale: string;
};

export function OrganizationJsonLd({ description, locale }: OrganizationJsonLdProps) {
  const baseUrl = getSiteUrl();

  // Organization 结构化数据
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${baseUrl}/#organization`,
    name: getSiteName(),
    url: baseUrl,
    description,
    logo: `${baseUrl}/icons/apple-touch-icon.png`,
    // 社交账号上线后取消注释
    // sameAs: [
    //   'https://twitter.com/lolobuyspreadsheets',
    //   'https://discord.gg/lolobuyspreadsheets',
    // ],
  };

  // Website 结构化数据（含 Sitelinks Searchbox）
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${baseUrl}/#website`,
    name: getSiteName(),
    url: baseUrl,
    description,
    publisher: {
      '@id': `${baseUrl}/#organization`,
    },
    // Sitelinks Searchbox - 让 Google 显示站内搜索框
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/${locale}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
    </>
  );
}

export default OrganizationJsonLd;
