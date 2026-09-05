import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('main-site 51.LA analytics boundary', () => {
  const layoutSource = readFileSync(
    join(process.cwd(), 'src', 'app', 'layout.tsx'),
    'utf8',
  );
  const nextConfigSource = readFileSync(
    join(process.cwd(), 'next.config.ts'),
    'utf8',
  );

  it('loads the collector only when no tenant is resolved', () => {
    expect(layoutSource).toContain('{!tenant && (');
    expect(layoutSource).toContain('id="LA_COLLECT"');
    expect(layoutSource).toContain('https://sdk.51.la/js-sdk-pro.min.js');
  });

  it('allows only the required SDK and collector origins in CSP', () => {
    expect(nextConfigSource).toContain('https://sdk.51.la');
    expect(nextConfigSource).toContain('https://collect-v6.51.la');
  });
});
