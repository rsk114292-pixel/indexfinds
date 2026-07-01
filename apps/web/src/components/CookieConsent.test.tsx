import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CookieConsent, {
  CookieConsentProvider,
  isReferralAttributionContext,
} from './CookieConsent';
import ConditionalGA from './ConditionalGA';
import type { TrackingConfig } from '@/lib/tracking-config';

const mockGoogleAnalytics = jest.fn(({ gaId }: { gaId: string }) => (
  <div data-testid="ga" data-ga-id={gaId} />
));

const mockGoogleTagManager = jest.fn(({ gtmId }: { gtmId: string }) => (
  <div data-testid="gtm" data-gtm-id={gtmId} />
));

jest.mock('@next/third-parties/google', () => ({
  GoogleAnalytics: (props: { gaId: string }) => mockGoogleAnalytics(props),
  GoogleTagManager: (props: { gtmId: string }) => mockGoogleTagManager(props),
}));

describe('Cookie consent tracking integration', () => {
  const baseTrackingConfig: TrackingConfig = {
    gaId: 'G-TEST123456',
    gtmId: '',
    enabled: true,
  };
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    document.cookie = 'cookie_consent=; path=/; max-age=0';
    window.history.pushState({}, '', '/');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => baseTrackingConfig,
    } as Response);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('loads GA immediately after accepting cookies on the current page', async () => {
    render(
      <CookieConsentProvider>
        <ConditionalGA initialConfig={baseTrackingConfig} />
        <CookieConsent />
      </CookieConsentProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'accept' }));

    await waitFor(() => {
      expect(screen.getByTestId('ga')).toHaveAttribute(
        'data-ga-id',
        'G-TEST123456',
      );
    });
  });

  it('ignores invalid tracking IDs returned by the API', async () => {
    const invalidTrackingConfig: TrackingConfig = {
        gaId: '<script>alert(1)</script>',
        gtmId: '',
        enabled: true,
      };

    localStorage.setItem('cookie_consent', 'accepted');

    render(
      <CookieConsentProvider>
        <ConditionalGA initialConfig={invalidTrackingConfig} />
      </CookieConsentProvider>,
    );

    expect(screen.queryByTestId('ga')).not.toBeInTheDocument();
    expect(mockGoogleAnalytics).not.toHaveBeenCalled();
  });

  it('falls back to a client fetch when the server could not preload tracking config', async () => {
    localStorage.setItem('cookie_consent', 'accepted');
    document.cookie = 'cookie_consent=accepted; path=/';

    render(
      <CookieConsentProvider>
        <ConditionalGA initialConfig={null} />
      </CookieConsentProvider>,
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:4101/settings/tracking',
        expect.objectContaining({
          credentials: 'include',
          signal: expect.any(AbortSignal),
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('ga')).toHaveAttribute(
        'data-ga-id',
        'G-TEST123456',
      );
    });
  });

  it('preserves the dataLayer push context when wrapping GTM events', async () => {
    const gtmTrackingConfig: TrackingConfig = {
      gaId: '',
      gtmId: 'GTM-TEST123',
      enabled: true,
    };

    localStorage.setItem('cookie_consent', 'accepted');
    document.cookie = 'cookie_consent=accepted; path=/';
    const dataLayer: unknown[] = [];
    Object.assign(window, { dataLayer });

    render(
      <CookieConsentProvider>
        <ConditionalGA initialConfig={gtmTrackingConfig} />
      </CookieConsentProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('gtm')).toHaveAttribute(
        'data-gtm-id',
        'GTM-TEST123',
      );
    });

    expect(() =>
      dataLayer.push({ event: 'page_view' }),
    ).not.toThrow();
    expect(dataLayer).toHaveLength(1);
  });

  it('detects referral attribution context from referral query params', () => {
    expect(
      isReferralAttributionContext(
        new URLSearchParams(
          'utm_source=referral_link&utm_medium=referral&utm_campaign=referral_invite',
        ),
      ),
    ).toBe(true);

    expect(
      isReferralAttributionContext(
        new URLSearchParams('utm_source=telegram&utm_medium=influencer'),
      ),
    ).toBe(true);

    expect(
      isReferralAttributionContext(new URLSearchParams('utm_source=google')),
    ).toBe(false);
  });

  it('renders the stronger referral consent prompt for referral visits', () => {
    window.history.pushState(
      {},
      '',
      '/en?utm_source=referral_link&utm_medium=referral&utm_campaign=referral_invite',
    );

    render(
      <CookieConsentProvider>
        <CookieConsent />
      </CookieConsentProvider>,
    );

    expect(screen.getByTestId('cookie-consent')).toHaveAttribute(
      'data-consent-variant',
      'referral',
    );
    expect(screen.getByText('attributionHint')).toBeInTheDocument();
  });
});
