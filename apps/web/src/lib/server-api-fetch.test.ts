describe('server-api-fetch', () => {
  const originalNextPhase = process.env.NEXT_PHASE;
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const originalFetch = global.fetch;

  const jsonResponse = (value: unknown) =>
    ({
      ok: true,
      status: 200,
      json: async () => value,
    }) as Response;

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    process.env.NEXT_PHASE = originalNextPhase;
    process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      delete (global as unknown as { fetch?: typeof fetch }).fetch;
    }
  });

  it('skips localhost API requests during production build', async () => {
    process.env.NEXT_PHASE = 'phase-production-build';
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4101';
    const { shouldSkipServerApiFetch } = await import('./server-api-fetch');

    expect(shouldSkipServerApiFetch('/products/slugs?limit=200')).toBe(true);
    expect(shouldSkipServerApiFetch('http://localhost:4101/products')).toBe(true);
    expect(shouldSkipServerApiFetch('http://127.0.0.1:4000/products')).toBe(true);
  });

  it('keeps remote API requests enabled during production build', async () => {
    process.env.NEXT_PHASE = 'phase-production-build';
    process.env.NEXT_PUBLIC_API_URL = 'https://api.lolobuyspreadsheets.com';
    const { shouldSkipServerApiFetch } = await import('./server-api-fetch');

    expect(shouldSkipServerApiFetch('/products/slugs?limit=200')).toBe(false);
    expect(shouldSkipServerApiFetch('https://api.lolobuyspreadsheets.com/products')).toBe(false);
  });

  it('builds tracking headers for server-side fetches', async () => {
    const { buildServerTrackingHeaders } = await import('./server-api-fetch');

    expect(
      buildServerTrackingHeaders({
        trustedVisitorId: 'vid_test',
        sessionId: 'sess_test',
        visitId: 'visit_test',
      }),
    ).toEqual({
      cookie: 'mf_vid=vid_test; session_id=sess_test; mf_visit=visit_test',
      'x-visit-id': 'visit_test',
    });
  });

  it('returns the last successful public response when the API fails', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.lolobuyspreadsheets.com';
    const {
      fetchServerApiJson,
      __resetServerApiFallbackCacheForTests,
    } = await import('./server-api-fetch');
    __resetServerApiFallbackCacheForTests();
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ data: ['cached-product'] }),
      )
      .mockRejectedValueOnce(new Error('upstream unavailable'));
    global.fetch = fetchMock as typeof fetch;

    await expect(
      fetchServerApiJson<{ data: string[] }>('/products?limit=1'),
    ).resolves.toEqual({ data: ['cached-product'] });
    await expect(
      fetchServerApiJson<{ data: string[] }>('/products?limit=1'),
    ).resolves.toEqual({ data: ['cached-product'] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not share fallback data for requests with visitor headers', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.lolobuyspreadsheets.com';
    const {
      fetchServerApiJson,
      __resetServerApiFallbackCacheForTests,
    } = await import('./server-api-fetch');
    __resetServerApiFallbackCacheForTests();
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ data: ['private-result'] }),
      )
      .mockRejectedValueOnce(new Error('upstream unavailable'));
    global.fetch = fetchMock as typeof fetch;
    const init = { headers: { 'x-visit-id': 'visit-1' } };

    await expect(
      fetchServerApiJson<{ data: string[] }>('/products?search=nike', init),
    ).resolves.toEqual({ data: ['private-result'] });
    await expect(
      fetchServerApiJson<{ data: string[] }>('/products?search=nike', init),
    ).resolves.toBeNull();
  });

  it('aborts an upstream request after the configured deadline', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.lolobuyspreadsheets.com';
    const {
      fetchServerApiJson,
      __resetServerApiFallbackCacheForTests,
    } = await import('./server-api-fetch');
    __resetServerApiFallbackCacheForTests();
    global.fetch = jest.fn().mockImplementation(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(init.signal?.reason || new Error('aborted')),
            { once: true },
          );
        }),
    ) as typeof fetch;

    const startedAt = Date.now();
    await expect(
      fetchServerApiJson('/slow-endpoint', {
        timeoutMs: 20,
        staleIfErrorMs: 0,
      }),
    ).resolves.toBeNull();
    expect(Date.now() - startedAt).toBeLessThan(500);
  });
});
