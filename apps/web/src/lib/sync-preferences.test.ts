import { syncPreferenceToServer } from './sync-preferences';

const mockPatch = jest.fn().mockResolvedValue(undefined);

jest.mock('./api', () => ({
  patch: (...args: unknown[]) => mockPatch(...args),
}));

const mockGetState = jest.fn();
jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: {
    getState: () => mockGetState(),
    subscribe: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('syncPreferenceToServer', () => {
  it('should not call API when not authenticated', () => {
    mockGetState.mockReturnValue({ isAuthenticated: false });
    syncPreferenceToServer('preferredCurrency', 'USD');
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('should call PATCH /auth/me/preferences when authenticated', () => {
    mockGetState.mockReturnValue({ isAuthenticated: true, token: 'tok' });
    syncPreferenceToServer('preferredCurrency', 'EUR');
    expect(mockPatch).toHaveBeenCalledWith('/auth/me/preferences', {
      preferredCurrency: 'EUR',
    });
  });

  it('should call with preferredPlatform', () => {
    mockGetState.mockReturnValue({ isAuthenticated: true, token: 'tok' });
    syncPreferenceToServer('preferredPlatform', 'pandabuy');
    expect(mockPatch).toHaveBeenCalledWith('/auth/me/preferences', {
      preferredPlatform: 'pandabuy',
    });
  });

  it('should not throw when API fails', () => {
    mockGetState.mockReturnValue({ isAuthenticated: true, token: 'tok' });
    mockPatch.mockRejectedValueOnce(new Error('network'));
    expect(() => syncPreferenceToServer('preferredCurrency', 'GBP')).not.toThrow();
  });
});
