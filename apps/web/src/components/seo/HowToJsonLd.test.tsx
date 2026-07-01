import React from 'react';
import { render } from '@testing-library/react';
import { HowToJsonLd } from './HowToJsonLd';

function getJsonLd(container: HTMLElement) {
  const script = container.querySelector('script[type="application/ld+json"]');
  return script ? JSON.parse(script.textContent || '{}') : null;
}

describe('HowToJsonLd', () => {
  const props = {
    name: 'How It Works',
    description: 'From discovery to delivery',
    steps: [
      { name: 'Search', text: 'Browse products' },
      { name: 'Compare', text: 'View QC photos' },
      { name: 'Choose', text: 'Pick an agent' },
    ],
  };

  it('输出 HowTo schema 类型', () => {
    const { container } = render(<HowToJsonLd {...props} />);
    const jsonLd = getJsonLd(container);

    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('HowTo');
    expect(jsonLd.name).toBe('How It Works');
    expect(jsonLd.description).toBe('From discovery to delivery');
  });

  it('步骤包含 position 且从 1 开始', () => {
    const { container } = render(<HowToJsonLd {...props} />);
    const jsonLd = getJsonLd(container);

    expect(jsonLd.step).toHaveLength(3);
    expect(jsonLd.step[0]).toEqual({
      '@type': 'HowToStep',
      position: 1,
      name: 'Search',
      text: 'Browse products',
    });
    expect(jsonLd.step[2].position).toBe(3);
  });

  it('空步骤不渲染 script 标签', () => {
    const { container } = render(
      <HowToJsonLd name="Test" description="Test" steps={[]} />,
    );
    const jsonLd = getJsonLd(container);

    expect(jsonLd).toBeNull();
  });
});
