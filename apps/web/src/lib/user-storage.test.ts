import { getCurrentUserId } from './user-storage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
});

describe('getCurrentUserId', () => {
  it('should return "guest" when no auth data', () => {
    expect(getCurrentUserId()).toBe('guest');
  });

  it('should return "guest" when auth data has no user', () => {
    localStorageMock.setItem('auth-storage', JSON.stringify({ state: {} }));
    expect(getCurrentUserId()).toBe('guest');
  });

  it('should return user id when logged in', () => {
    localStorageMock.setItem(
      'auth-storage',
      JSON.stringify({ state: { user: { id: 'abc-123' } } }),
    );
    expect(getCurrentUserId()).toBe('abc-123');
  });

  it('should return "guest" when auth data is corrupted', () => {
    localStorageMock.setItem('auth-storage', 'not-json');
    expect(getCurrentUserId()).toBe('guest');
  });

  it('should return "guest" when user id is null', () => {
    localStorageMock.setItem(
      'auth-storage',
      JSON.stringify({ state: { user: { id: null } } }),
    );
    expect(getCurrentUserId()).toBe('guest');
  });
});
