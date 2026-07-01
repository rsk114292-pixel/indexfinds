/**
 * ItemList JSON-LD 结构化数据组件
 * 用于 Google 搜索结果显示列表轮播（品牌列表、分类列表）
 */

interface ListItem {
  name: string;
  url: string;
}

interface ItemListJsonLdProps {
  name: string;
  items: ListItem[];
}

export function ItemListJsonLd({ name, items }: ItemListJsonLdProps) {
  if (items.length === 0) return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default ItemListJsonLd;
