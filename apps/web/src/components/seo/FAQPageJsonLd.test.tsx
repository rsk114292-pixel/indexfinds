import React from 'react';
import { render } from '@testing-library/react';
import { FAQPageJsonLd } from './FAQPageJsonLd';

function getJsonLd(container: HTMLElement) {
  const script = container.querySelector('script[type="application/ld+json"]');
  return script ? JSON.parse(script.textContent || '{}') : null;
}

describe('FAQPageJsonLd', () => {
  const items = [
    { question: 'What is this?', answer: 'A product discovery platform.' },
    { question: 'Is it free?', answer: 'Yes, completely free.' },
  ];

  it('输出 FAQPage schema 类型', () => {
    const { container } = render(<FAQPageJsonLd items={items} />);
    const jsonLd = getJsonLd(container);

    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('FAQPage');
  });

  it('mainEntity 包含所有 Q&A 且结构正确', () => {
    const { container } = render(<FAQPageJsonLd items={items} />);
    const jsonLd = getJsonLd(container);

    expect(jsonLd.mainEntity).toHaveLength(2);
    expect(jsonLd.mainEntity[0]).toEqual({
      '@type': 'Question',
      name: 'What is this?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A product discovery platform.',
      },
    });
  });

  it('空数组不渲染 script 标签', () => {
    const { container } = render(<FAQPageJsonLd items={[]} />);
    const jsonLd = getJsonLd(container);

    expect(jsonLd).toBeNull();
  });
});
