import { act, renderHook } from '@testing-library/react';
import { useBuyProduct } from './useBuyProduct';

const mockGet = jest.fn();
const mockEnsureVisitSessionRecorded = jest.fn();
const mockFlushVisitEngagement = jest.fn();
const mockRecordOutboundClick = jest.fn();
const mockMarkOutbound = jest.fn();
const mockClearSearchClickId = jest.fn();
const mockTrackGA4Event = jest.fn();

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

jest.mock('@/lib/api', () => ({
  get: (...args: unknown[]) => mockGet(...args),
}));

jest.mock('@/components/CookieConsent', () => ({
  useCookieConsent: () => ({ consent: 'accepted' }),
}));

jest.mock('@/lib/visit-tracking', () => ({
  ensureVisitSessionRecorded: (...args: unknown[]) =>
    mockEnsureVisitSessionRecorded(...args),
  flushVisitEngagement: (...args: unknown[]) =>
    mockFlushVisitEngagement(...args),
}));

jest.mock('@/lib/ga-events', () => ({
  trackGA4Event: (...args: unknown[]) => mockTrackGA4Event(...args),
}));

jest.mock('@/lib/search-tracking', () => ({
  detectLocaleFromPath: jest.fn(() => 'en'),
  detectOutboundViewportDeviceType: jest.fn(() => 'desktop'),
  detectOutboundPageType: jest.fn(() => 'product'),
  markOutbound: (...args: unknown[]) => mockMarkOutbound(...args),
  getSearchClickId: jest.fn(() => null),
  getSearchClickQuery: jest.fn(() => null),
  clearSearchClickId: (...args: unknown[]) => mockClearSearchClickId(...args),
  recordOutboundClick: (...args: unknown[]) => mockRecordOutboundClick(...args),
  getPageSource: jest.fn(() => 'direct'),
  getCurrentTrackingIdentity: jest.fn(() => ({
    deviceId: 'sess_test',
    visitId: 'visit_test',
  })),
}));

describe('useBuyProduct', () => {
  let mockPopup: { location: { href: string }; close: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPopup = {
      location: { href: '' },
      close: jest.fn(),
    };
    mockGet.mockResolvedValue({
      url: 'https://example.com/buy',
      platform: 'acbuy',
      platformName: 'ACBuy',
      weidianItemId: 'wd-1',
      productId: 'prod-1',
      productTitle: 'Test Product',
    });
    mockEnsureVisitSessionRecorded.mockResolvedValue(true);
    mockFlushVisitEngagement.mockReturnValue(undefined);
    mockRecordOutboundClick.mockResolvedValue('outbound-1');
    mockMarkOutbound.mockResolvedValue(undefined);
    Object.defineProperty(window, 'open', {
      writable: true,
      value: jest.fn(() => mockPopup),
    });
    window.history.replaceState({}, '', '/en/products/test-product');
  });

  it('opens a blank tab synchronously and navigates it after recording outbound click', async () => {
    const { result } = renderHook(() =>
      useBuyProduct({ productId: 'prod-1' }),
    );

    await act(async () => {
      await result.current.buyWithPlatform('acbuy');
    });

    expect(mockEnsureVisitSessionRecorded).toHaveBeenCalledWith('accepted', 600);
    expect(mockRecordOutboundClick).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'prod-1',
        sessionId: 'sess_test',
        visitId: 'visit_test',
      }),
    );
    expect(window.open).toHaveBeenCalledWith('about:blank', '_blank');
    expect(mockPopup.location.href).toBe('https://example.com/buy');
  });

  it('waits for visit recording before sending outbound analytics', async () => {
    const deferredVisitRecord = createDeferred<boolean>();
    mockEnsureVisitSessionRecorded.mockImplementation(
      () => deferredVisitRecord.promise,
    );

    const { result } = renderHook(() =>
      useBuyProduct({ productId: 'prod-1' }),
    );

    let buyPromise: Promise<void> | null = null;
    act(() => {
      buyPromise = result.current.buyWithPlatform('acbuy');
    });

    await Promise.resolve();
    expect(mockRecordOutboundClick).not.toHaveBeenCalled();
    expect(window.open).toHaveBeenCalledWith('about:blank', '_blank');
    expect(mockPopup.location.href).toBe('');

    deferredVisitRecord.resolve(true);

    const pendingBuy = buyPromise;
    if (!pendingBuy) {
      throw new Error('Expected buy promise to be created');
    }

    await act(async () => {
      await pendingBuy;
    });

    expect(mockRecordOutboundClick).toHaveBeenCalledTimes(1);
    expect(mockPopup.location.href).toBe('https://example.com/buy');
  });

  it('closes the blank popup when the buy-link request fails', async () => {
    const error = new Error('buy-link failed');
    const onError = jest.fn();
    mockGet.mockRejectedValue(error);

    const { result } = renderHook(() =>
      useBuyProduct({ productId: 'prod-1', onError }),
    );

    await act(async () => {
      await result.current.buyWithPlatform('acbuy');
    });

    expect(window.open).toHaveBeenCalledWith('about:blank', '_blank');
    expect(mockPopup.close).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(error);
  });
});
