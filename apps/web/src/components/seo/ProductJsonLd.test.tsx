import React from 'react';
import { render } from '@testing-library/react';
import { ProductJsonLd } from './ProductJsonLd';
import { getSiteUrl } from '@/lib/site-config';

const SITE_URL = getSiteUrl();

const baseProduct = {
  slug: 'nike-air-max-90',
  title: 'Nike Air Max 90',
  priceMin: 299,
  priceMax: 599,
  currency: 'CNY',
};

function getJsonLd(container: HTMLElement) {
  const script = container.querySelector('script[type="application/ld+json"]');
  return script ? JSON.parse(script.textContent || '{}') : null;
}

describe('ProductJsonLd', () => {
  it('should include locale prefix in product URL', () => {
    const { container } = render(
      <ProductJsonLd product={baseProduct} locale="zh" />,
    );
    const jsonLd = getJsonLd(container);

    expect(jsonLd.url).toBe(`${SITE_URL}/zh/products/nike-air-max-90`);
  });

  it('should include locale prefix in offers URL', () => {
    const { container } = render(
      <ProductJsonLd product={baseProduct} locale="fr" />,
    );
    const jsonLd = getJsonLd(container);

    expect(jsonLd.offers.url).toBe(`${SITE_URL}/fr/products/nike-air-max-90`);
  });

  it('should fallback to en when locale is not provided', () => {
    const { container } = render(
      <ProductJsonLd product={baseProduct} />,
    );
    const jsonLd = getJsonLd(container);

    expect(jsonLd.url).toBe(`${SITE_URL}/en/products/nike-air-max-90`);
    expect(jsonLd.offers.url).toBe(`${SITE_URL}/en/products/nike-air-max-90`);
  });

  it('should include brand and category when provided', () => {
    const { container } = render(
      <ProductJsonLd
        locale="fr"
        product={{
          ...baseProduct,
          brand: { name: 'Nike' },
          primaryCategory: {
            name: '鞋子',
            nameEn: 'Shoes',
            translations: {
              fr: { name: 'Chaussures' },
            },
          },
        }}
      />,
    );
    const jsonLd = getJsonLd(container);

    expect(jsonLd.brand).toEqual({ '@type': 'Brand', name: 'Nike' });
    expect(jsonLd.category).toBe('Chaussures');
  });

  it('should output correct price info', () => {
    const { container } = render(
      <ProductJsonLd product={baseProduct} locale="en" />,
    );
    const jsonLd = getJsonLd(container);

    expect(jsonLd.offers.lowPrice).toBe(299);
    expect(jsonLd.offers.highPrice).toBe(599);
    expect(jsonLd.offers.priceCurrency).toBe('CNY');
  });

  it('priceMin 为 null 时不输出 offers', () => {
    const { container } = render(
      <ProductJsonLd
        product={{ slug: 'no-price', title: 'No Price Product' }}
        locale="en"
      />,
    );
    const jsonLd = getJsonLd(container);

    expect(jsonLd.offers).toBeUndefined();
  });

  it('priceMin 为 0 时不输出 offers', () => {
    const { container } = render(
      <ProductJsonLd
        product={{ slug: 'zero-price', title: 'Zero Price', priceMin: 0 }}
        locale="en"
      />,
    );
    const jsonLd = getJsonLd(container);

    expect(jsonLd.offers).toBeUndefined();
  });

  it('uses localized fallback description when provided', () => {
    const { container } = render(
      <ProductJsonLd
        product={{ slug: 'fallback-product', title: 'Fallback Product' }}
        locale="fr"
        fallbackDescription="Achetez Fallback Product sur IndexFinds"
      />,
    );
    const jsonLd = getJsonLd(container);

    expect(jsonLd.description).toBe('Achetez Fallback Product sur IndexFinds');
  });
});
