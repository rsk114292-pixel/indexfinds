import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('service worker product image handling', () => {
  const source = readFileSync(join(process.cwd(), 'public', 'sw.js'), 'utf8');

  it('leaves geilicdn product images on the native browser network path', () => {
    const geilicdnBranch = source.match(
      /if \(url\.hostname === 'si\.geilicdn\.com'\) \{([\s\S]*?)\n  \}/,
    );

    expect(geilicdnBranch).not.toBeNull();
    expect(geilicdnBranch?.[1]).not.toContain('respondWith');
    expect(geilicdnBranch?.[1]).not.toContain('fetch(');
  });

  it('bumps the cache version so existing clients activate the fix', () => {
    expect(source).toContain("const CACHE_VERSION = 'fs-v4';");
  });
});
