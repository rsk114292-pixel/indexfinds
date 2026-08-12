/**
 * BreadcrumbList JSON-LD 结构化数据组件
 * 用于 Google 搜索结果显示面包屑导航
 *
 * 效果示例：
 * IndexFinds > Sneakers > Nike > Air Max 90
 */

import { getSiteUrl } from '@/lib/site-config';

interface BreadcrumbItem {
  name: string;
  slug?: string;
  url?: string;
}

interface BreadcrumbJsonLdProps {
  items: BreadcrumbItem[];
  locale?: string;
  homeName?: string;
}

export function BreadcrumbJsonLd({
  items,
  locale = 'en',
  homeName = 'Home',
}: BreadcrumbJsonLdProps) {
  const baseUrl = getSiteUrl();
  const localeBase = `${baseUrl}/${locale}`;

  // 将相对路径转为带 locale 的绝对路径
  function toAbsoluteUrl(url?: string, slug?: string): string {
    if (!url && !slug) return '';
    if (slug) return `${localeBase}/categories/${slug}`;
    if (!url) return '';
    // 已经是绝对路径则直接返回
    if (url.startsWith('http')) return url;
    // 相对路径 → 绝对路径
    return `${localeBase}${url === '/' ? '' : url}`;
  }

  // 构建面包屑列表，始终以首页开头
  const breadcrumbItems = [
    { name: homeName, url: localeBase },
    ...items.map((item) => ({
      name: item.name,
      url: toAbsoluteUrl(item.url, item.slug),
    })),
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url && { item: item.url }),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default BreadcrumbJsonLd;
