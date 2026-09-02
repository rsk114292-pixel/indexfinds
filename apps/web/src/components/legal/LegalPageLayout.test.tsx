import { renderToStaticMarkup } from 'react-dom/server';

import LegalPageLayout from './LegalPageLayout';

describe('LegalPageLayout', () => {
  it('renders one semantic heading and one copy of the page content', () => {
    const markup = renderToStaticMarkup(
      <LegalPageLayout
        title="Privacy Policy"
        lastUpdated="September 3, 2026"
        sections={[{ id: 'overview', title: 'Overview' }]}
      >
        <section id="overview">
          <h2>Overview</h2>
          <p>Unique legal page content.</p>
        </section>
      </LegalPageLayout>
    );

    expect(markup.match(/<h1\b/g)).toHaveLength(1);
    expect(markup.match(/id="overview"/g)).toHaveLength(1);
    expect(markup.match(/Unique legal page content\./g)).toHaveLength(1);
    expect(markup).toContain('aria-label="Table of contents"');
    expect(markup).toContain('aria-expanded="false"');
  });
});
