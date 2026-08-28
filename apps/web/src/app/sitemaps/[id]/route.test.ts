/**
 * @jest-environment node
 */

import { GET } from './route';

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('sitemap chunk route', () => {
  it('returns a real 404 for a numeric chunk outside the current index', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ total: 0, reviewedOnly: true }),
    });

    const response = await GET(
      new Request('https://indexfinds.com/sitemaps/1', {
        headers: { host: 'indexfinds.com' },
      }),
      { params: Promise.resolve({ id: '1' }) },
    );

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('Not Found');
  });
});
