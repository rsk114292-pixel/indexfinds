import { renderToStaticMarkup } from 'react-dom/server';

import HelpPageClient from '../help/HelpPageClient';
import HowItWorksPageClient from '../how-it-works/HowItWorksPageClient';

describe('responsive informational pages', () => {
  it.each([
    ['help', <HelpPageClient />],
    ['how it works', <HowItWorksPageClient />],
  ])('renders one semantic content tree for %s', (_name, page) => {
    const markup = renderToStaticMarkup(page);

    expect(markup.match(/<h1\b/g)).toHaveLength(1);
  });

  it('renders each FAQ section once', () => {
    const markup = renderToStaticMarkup(<HelpPageClient />);

    expect(markup.match(/id="faq-gettingStarted"/g)).toHaveLength(1);
    expect(markup.match(/id="faq-shoppingQc"/g)).toHaveLength(1);
    expect(markup.match(/id="faq-agentsOrders"/g)).toHaveLength(1);
    expect(markup.match(/id="faq-accountSupport"/g)).toHaveLength(1);
  });
});
