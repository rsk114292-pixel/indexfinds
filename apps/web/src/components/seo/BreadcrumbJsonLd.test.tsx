import React from 'react';
import { render } from '@testing-library/react';
import { BreadcrumbJsonLd } from './BreadcrumbJsonLd';
import { getSiteUrl } from '@/lib/site-config';

const SITE_URL = getSiteUrl();

function getJsonLd(container: HTMLElement) {
  const script = container.querySelector('script[type="application/ld+json"]');
  return script ? JSON.parse(script.textContent || '{}') : null;
}

describe('BreadcrumbJsonLd', () => {
  it('组件自动添加 Home 首项，不需要调用方传入', () => {
    const { container } = render(
      <BreadcrumbJsonLd
        locale="en"
        items={[{ name: 'Shoes', url: '/categories/shoes' }]}
      />,
    );
    const jsonLd = getJsonLd(container);
    const items = jsonLd.itemListElement;

    expect(items).toHaveLength(2);
    expect(items[0].name).toBe('Home');
    expect(items[0].item).toBe(`${SITE_URL}/en`);
  });

  it('允许调用方传入本地化首页名称', () => {
    const { container } = render(
      <BreadcrumbJsonLd
        locale="zh"
        homeName="首页"
        items={[{ name: '鞋子', url: '/categories/shoes' }]}
      />,
    );
    const jsonLd = getJsonLd(container);

    expect(jsonLd.itemListElement[0].name).toBe('首页');
    expect(jsonLd.itemListElement[0].item).toBe(`${SITE_URL}/zh`);
  });

  it('所有 URL 应为包含 locale 的绝对路径', () => {
    const { container } = render(
      <BreadcrumbJsonLd
        locale="zh"
        items={[
          { name: '鞋子', url: '/categories/shoes' },
          { name: 'Nike Air Max' },
        ]}
      />,
    );
    const jsonLd = getJsonLd(container);
    const items = jsonLd.itemListElement;

    expect(items[0].item).toBe(`${SITE_URL}/zh`);
    expect(items[1].item).toBe(`${SITE_URL}/zh/categories/shoes`);
    expect(items[2].item).toBeUndefined(); // 最后一项不输出 item
  });

  it('slug fallback 也应包含 locale', () => {
    const { container } = render(
      <BreadcrumbJsonLd
        locale="fr"
        items={[{ name: 'Sneakers', slug: 'sneakers' }]}
      />,
    );
    const jsonLd = getJsonLd(container);

    expect(jsonLd.itemListElement[1].item).toBe(
      `${SITE_URL}/fr/categories/sneakers`,
    );
  });

  it('uses a tenant base URL when provided', () => {
    const { container } = render(
      <BreadcrumbJsonLd
        locale="en"
        baseUrl="https://usfansindex.net"
        items={[{ name: 'Products', url: '/products' }]}
      />,
    );
    const jsonLd = getJsonLd(container);

    expect(jsonLd.itemListElement[0].item).toBe(
      'https://usfansindex.net/en',
    );
    expect(jsonLd.itemListElement[1].item).toBe(
      'https://usfansindex.net/en/products',
    );
  });
});
