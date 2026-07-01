import React from 'react';
import { render } from '@testing-library/react';
import { ItemListJsonLd } from './ItemListJsonLd';

function getJsonLd(container: HTMLElement) {
  const script = container.querySelector('script[type="application/ld+json"]');
  return script ? JSON.parse(script.textContent || '{}') : null;
}

describe('ItemListJsonLd', () => {
  const items = [
    { name: 'Nike', url: 'https://example.com/en/brands/nike' },
    { name: 'Adidas', url: 'https://example.com/en/brands/adidas' },
  ];

  it('输出 ItemList schema 类型', () => {
    const { container } = render(
      <ItemListJsonLd name="Brands" items={items} />,
    );
    const jsonLd = getJsonLd(container);

    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('ItemList');
    expect(jsonLd.name).toBe('Brands');
    expect(jsonLd.numberOfItems).toBe(2);
  });

  it('列表项包含 position、name、url', () => {
    const { container } = render(
      <ItemListJsonLd name="Brands" items={items} />,
    );
    const jsonLd = getJsonLd(container);

    expect(jsonLd.itemListElement).toHaveLength(2);
    expect(jsonLd.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: 'Nike',
      url: 'https://example.com/en/brands/nike',
    });
    expect(jsonLd.itemListElement[1].position).toBe(2);
  });

  it('空列表不渲染 script 标签', () => {
    const { container } = render(
      <ItemListJsonLd name="Empty" items={[]} />,
    );
    const jsonLd = getJsonLd(container);

    expect(jsonLd).toBeNull();
  });
});
