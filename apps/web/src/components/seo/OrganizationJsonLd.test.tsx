import React from 'react';
import { render } from '@testing-library/react';
import { OrganizationJsonLd } from './OrganizationJsonLd';
import { getSiteUrl } from '@/lib/site-config';

const SITE_URL = getSiteUrl();

function getJsonLdScripts(container: HTMLElement) {
  return Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map(
    (script) => JSON.parse(script.textContent || '{}'),
  );
}

describe('OrganizationJsonLd', () => {
  it('uses the current locale in sitelinks searchbox urlTemplate', () => {
    const { container } = render(
      <OrganizationJsonLd description="Localized description" locale="ar" />,
    );
    const scripts = getJsonLdScripts(container);
    const websiteJsonLd = scripts[1];

    expect(websiteJsonLd['@type']).toBe('WebSite');
    expect(websiteJsonLd.potentialAction.target.urlTemplate).toBe(
      `${SITE_URL}/ar/search?q={search_term_string}`,
    );
  });

  it('reuses the same description in organization and website json-ld', () => {
    const { container } = render(
      <OrganizationJsonLd description="French home description" locale="fr" />,
    );
    const [organizationJsonLd, websiteJsonLd] = getJsonLdScripts(container);

    expect(organizationJsonLd.description).toBe('French home description');
    expect(websiteJsonLd.description).toBe('French home description');
  });
});
