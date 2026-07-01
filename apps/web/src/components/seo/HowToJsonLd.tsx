/**
 * HowTo JSON-LD 结构化数据组件
 * 用于 Google 搜索结果显示步骤
 */

interface HowToStep {
  name: string;
  text: string;
}

interface HowToJsonLdProps {
  name: string;
  description: string;
  steps: HowToStep[];
}

export function HowToJsonLd({ name, description, steps }: HowToJsonLdProps) {
  if (steps.length === 0) return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    step: steps.map((s, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: s.name,
      text: s.text,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default HowToJsonLd;
