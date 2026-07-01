import {
  generateShareUrl,
  generateTrackedShareUrl,
  getOrCreateDeviceId,
  getOrCreateSessionId,
  getOrCreateVisitId,
} from './referral';

// jsdom 环境下 document.cookie 和 localStorage 均可用

function clearCookie(name: string) {
  document.cookie = `${name}=; max-age=0; path=/`;
}

beforeEach(() => {
  clearCookie('session_id');
  localStorage.clear();
  sessionStorage.clear();
});

describe('getOrCreateSessionId', () => {
  it('Cookie 存在时直接返回，并同步到 localStorage', () => {
    document.cookie = 'session_id=sess_from_cookie; path=/';

    const result = getOrCreateSessionId();

    expect(result).toBe('sess_from_cookie');
    expect(localStorage.getItem('session_id')).toBe('sess_from_cookie');
  });

  it('Cookie 不存在、localStorage 存在时返回 localStorage 值，并回写 Cookie', () => {
    localStorage.setItem('session_id', 'sess_from_storage');

    const result = getOrCreateSessionId();

    expect(result).toBe('sess_from_storage');
    expect(document.cookie).toContain('session_id=sess_from_storage');
  });

  it('两者都不存在时生成新 ID，同时写入 Cookie 和 localStorage', () => {
    const result = getOrCreateSessionId();

    expect(result).toMatch(/^sess_[a-z0-9]+$/);
    expect(document.cookie).toContain(`session_id=${result}`);
    expect(localStorage.getItem('session_id')).toBe(result);
  });

  it('多次调用返回同一个 ID（幂等）', () => {
    const first = getOrCreateSessionId();
    const second = getOrCreateSessionId();

    expect(first).toBe(second);
  });

  it('Cookie 优先级高于 localStorage（两者不同时以 Cookie 为准）', () => {
    document.cookie = 'session_id=sess_cookie_wins; path=/';
    localStorage.setItem('session_id', 'sess_storage_loses');

    const result = getOrCreateSessionId();

    expect(result).toBe('sess_cookie_wins');
    // localStorage 也被同步为 Cookie 的值
    expect(localStorage.getItem('session_id')).toBe('sess_cookie_wins');
  });

  it('Cookie 被清除后从 localStorage 恢复，并重新写入 Cookie', () => {
    // 先建立两者同步的状态
    const id = getOrCreateSessionId();
    // 模拟 Cookie 被清除
    clearCookie('session_id');
    expect(document.cookie).not.toContain('session_id=');

    const restored = getOrCreateSessionId();

    expect(restored).toBe(id);
    expect(document.cookie).toContain(`session_id=${id}`);
  });
});

describe('generateShareUrl', () => {
  it('returns a clean referral URL without UTM params', () => {
    expect(generateShareUrl('ABC123')).toBe(
      `${window.location.origin}/r/ABC123`,
    );
  });

  it('returns a tracked referral URL for copy flows', () => {
    expect(generateTrackedShareUrl('ABC123')).toBe(
      `${window.location.origin}/r/ABC123?utm_source=referral_link&utm_medium=referral&utm_campaign=referral_invite`,
    );
  });

  it('returns a channel-tagged referral URL when a share channel is provided', () => {
    expect(generateTrackedShareUrl('ABC123', undefined, 'telegram')).toBe(
      `${window.location.origin}/r/ABC123?utm_source=telegram&utm_medium=social&utm_campaign=referral_invite`,
    );
  });
});

describe('visit identity helpers', () => {
  it('getOrCreateDeviceId reuses the long-lived session cookie id', () => {
    const sessionId = getOrCreateSessionId();

    expect(getOrCreateDeviceId()).toBe(sessionId);
  });

  it('getOrCreateVisitId is stable within the same campaign and browser context', () => {
    const first = getOrCreateVisitId({
      campaignKey: 'referral_link|referral|invite',
      browserContext: 'standard_browser',
    });
    const second = getOrCreateVisitId({
      campaignKey: 'referral_link|referral|invite',
      browserContext: 'standard_browser',
    });

    expect(first).toBe(second);
    expect(first).toMatch(/^visit_[a-z0-9]+$/);
  });

  it('getOrCreateVisitId rotates when campaign changes', () => {
    const first = getOrCreateVisitId({
      campaignKey: 'referral_link|referral|invite',
      browserContext: 'standard_browser',
    });
    const second = getOrCreateVisitId({
      campaignKey: 'telegram|social|invite',
      browserContext: 'standard_browser',
    });

    expect(second).not.toBe(first);
  });
});
