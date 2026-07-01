/**
 * @jest-environment node
 */

import manifest from './manifest';
import { getManifestDescription } from '@/lib/home-seo';
import { getSiteName } from '@/lib/site-config';

describe('manifest', () => {
  it('uses a neutral root start_url instead of a hard-coded locale', () => {
    const result = manifest();

    expect(result.start_url).toBe('/');
    expect(result.scope).toBe('/');
  });

  it('uses the site name without an English-only suffix', () => {
    const result = manifest();

    expect(result.name).toBe(getSiteName());
    expect(result.short_name).toBe(getSiteName());
  });

  it('reuses the shared manifest description source', () => {
    const result = manifest();

    expect(result.description).toBe(getManifestDescription());
  });
});
