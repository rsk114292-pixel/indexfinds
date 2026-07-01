describe('server-api-fetch', () => {
  const originalNextPhase = process.env.NEXT_PHASE;
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    jest.resetModules();
    process.env.NEXT_PHASE = originalNextPhase;
    process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
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
});
