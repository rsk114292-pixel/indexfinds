jest.mock('./referral', () => ({
  getOrCreateDeviceId: jest.fn(() => 'sess_test'),
  getOrCreateVisitId: jest.fn(() => 'visit_test'),
}));

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: {
    getState: jest.fn(() => ({ token: null })),
  },
}));

jest.mock('./analytics-diagnostics', () => ({
  detectBrowserContext: jest.fn(() => ({
    isInAppBrowser: false,
    browserContext: 'standard_browser',
  })),
  getAnalyticsDiagnostics: jest.fn(() => ({
    consentStatus: 'accepted',
    gaStatus: 'ready',
    gaRequested: true,
    gaTrackingEnabled: true,
    gaScriptLoaded: true,
    gaConfiguredTarget: 'ga',
    gaFirstPageviewSent: true,
    gaEventCount: 1,
  })),
}));

const originalBlob = globalThis.Blob;

describe('visit engagement tracking', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-21T10:00:00.000Z'));
    jest.resetModules();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    window.history.replaceState({}, '', '/en/products/test?utm_source=google');
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: jest.fn(() => true),
    });
    Object.defineProperty(globalThis, 'Blob', {
      configurable: true,
      value: jest.fn().mockImplementation((parts: string[]) => ({
        text: () => Promise.resolve(parts.join('')),
      })),
    });
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true } as Response),
    ) as jest.Mock;
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'Blob', {
      configurable: true,
      value: originalBlob,
    });
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('flushes visible engagement at 10s and 30s milestones', async () => {
    const { startVisitEngagementTracking } = await import('./visit-tracking');

    startVisitEngagementTracking();

    jest.advanceTimersByTime(10000);
    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
    await expectBeaconPayload(0, {
      reason: 'milestone',
      activeDeltaMs: 10000,
      totalDeltaMs: 10000,
    });

    jest.advanceTimersByTime(5000);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/visit-sessions/engagement',
      expect.objectContaining({ method: 'PATCH' }),
    );

    jest.advanceTimersByTime(1000);
    setVisibilityState('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    jest.advanceTimersByTime(2000);
    setVisibilityState('visible');
    document.dispatchEvent(new Event('visibilitychange'));

    jest.advanceTimersByTime(14000);
    expect(navigator.sendBeacon).toHaveBeenCalledTimes(3);
    await expectBeaconPayload(2, {
      reason: 'milestone',
      activeDeltaMs: 2000,
      totalDeltaMs: 2000,
    });
  });
});

describe('visit diagnostics sync', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-21T10:00:00.000Z'));
    jest.resetModules();
    window.history.replaceState({}, '', '/en/products/test?utm_source=google');
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true } as Response),
    ) as jest.Mock;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('coalesces repeated diagnostics updates instead of bursting into the short rate limit', async () => {
    const { syncVisitDiagnostics } = await import('./visit-tracking');

    await syncVisitDiagnostics();
    await Promise.all([
      syncVisitDiagnostics(),
      syncVisitDiagnostics(),
      syncVisitDiagnostics(),
      syncVisitDiagnostics(),
      syncVisitDiagnostics(),
    ]);

    expect(global.fetch).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1000);

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenLastCalledWith(
      '/api/visit-sessions/diagnostics',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('does not create or send visit data before consent', async () => {
    const diagnosticsModule = await import('./analytics-diagnostics');
    jest.mocked(diagnosticsModule.getAnalyticsDiagnostics).mockReturnValue({
      consentStatus: 'rejected',
      gaStatus: 'disabled',
    });
    const referralModule = await import('./referral');
    const { recordVisitSession, syncVisitDiagnostics } =
      await import('./visit-tracking');

    await expect(recordVisitSession('rejected')).resolves.toBe(false);
    await syncVisitDiagnostics();

    expect(referralModule.getOrCreateDeviceId).not.toHaveBeenCalled();
    expect(referralModule.getOrCreateVisitId).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

function setVisibilityState(value: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value,
  });
}

async function expectBeaconPayload(
  callIndex: number,
  expected: Record<string, unknown>,
): Promise<void> {
  const beaconMock = navigator.sendBeacon as jest.Mock;
  const [url, blob] = beaconMock.mock.calls[callIndex];
  expect(url).toBe('/api/visit-sessions/engagement');

  const payload = JSON.parse(await (blob as Blob).text());
  expect(payload).toEqual(
    expect.objectContaining({
      sessionId: 'sess_test',
      visitId: 'visit_test',
      pagePath: '/en/products/test?utm_source=google',
      ...expected,
    }),
  );
}
