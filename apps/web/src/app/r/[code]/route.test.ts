/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from './route';

// mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeRequest(
  code: string,
  opts?: {
    redirect?: string;
    sessionCookie?: string;
    userAgent?: string;
    utm?: Record<string, string>;
  },
) {
  const url = new URL(`http://localhost:3101/r/${code}`);
  if (opts?.redirect) url.searchParams.set('redirect', opts.redirect);
  for (const [key, value] of Object.entries(opts?.utm || {})) {
    url.searchParams.set(key, value);
  }

  const req = new NextRequest(url, {
    headers: opts?.userAgent
      ? {
          'user-agent': opts.userAgent,
        }
      : undefined,
  });
  if (opts?.sessionCookie) {
    req.cookies.set('session_id', opts.sessionCookie);
  }

  const params = Promise.resolve({ code });
  return { req, params };
}

function mockApiSuccess(cookieValue?: string) {
  mockFetch.mockResolvedValueOnce({
    json: async () => ({ success: true, cookieValue: cookieValue ?? 'ref_abc' }),
  });
}

function mockApiFailure() {
  mockFetch.mockRejectedValueOnce(new Error('API down'));
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('GET /r/[code] — session_id cookie 行为', () => {
  it('请求无 session_id Cookie 时，生成新 ID 并设置非 httpOnly Cookie', async () => {
    mockApiSuccess();
    const { req, params } = makeRequest('ABC123');

    const res = await GET(req, { params });

    expect(res.status).toBe(302);

    const setCookieHeader = res.headers.getSetCookie();
    const sessionCookie = setCookieHeader.find((c) =>
      c.startsWith('session_id='),
    );
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toContain('session_id=sess_');
    // 关键：非 httpOnly
    expect(sessionCookie!.toLowerCase()).not.toContain('httponly');
  });

  it('请求已有 session_id Cookie 时，复用该值，不再设置新 Cookie', async () => {
    mockApiSuccess();
    const { req, params } = makeRequest('ABC123', {
      sessionCookie: 'sess_existing',
    });

    const res = await GET(req, { params });

    expect(res.status).toBe(302);

    const setCookieHeader = res.headers.getSetCookie();
    const sessionCookie = setCookieHeader.find((c) =>
      c.startsWith('session_id='),
    );
    // 已有 session 不应重新设置
    expect(sessionCookie).toBeUndefined();

    // 确认后端 API 收到的是复用的 sessionId
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.sessionId).toBe('sess_existing');
  });

  it('传给后端 API 的 sessionId 与 Cookie 中设置的一致', async () => {
    mockApiSuccess();
    const { req, params } = makeRequest('XYZ');

    const res = await GET(req, { params });

    // 从 Set-Cookie 头提取新生成的 sessionId
    const setCookieHeader = res.headers.getSetCookie();
    const sessionCookie = setCookieHeader.find((c) =>
      c.startsWith('session_id='),
    )!;
    const cookieValue = sessionCookie.split('=')[1].split(';')[0];

    // 与传给后端 API 的一致
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.sessionId).toBe(cookieValue);
  });

  it('API 调用失败时仍返回 302 跳转', async () => {
    mockApiFailure();
    const { req, params } = makeRequest('FAIL');

    const res = await GET(req, { params });

    expect(res.status).toBe(302);
  });

  it('session_id Cookie 设置 SameSite=Lax', async () => {
    mockApiSuccess();
    const { req, params } = makeRequest('LAX');

    const res = await GET(req, { params });

    const setCookieHeader = res.headers.getSetCookie();
    const sessionCookie = setCookieHeader.find((c) =>
      c.startsWith('session_id='),
    );
    expect(sessionCookie!.toLowerCase()).toContain('samesite=lax');
  });

  it('defaults invite links without redirect to referral_invite campaign', async () => {
    mockApiSuccess();
    const { req, params } = makeRequest('ABC123');

    const res = await GET(req, { params });

    const location = res.headers.get('location');
    expect(location).toContain('utm_source=referral_link');
    expect(location).toContain('utm_medium=referral');
    expect(location).toContain('utm_campaign=referral_invite');
  });

  it('defaults page-share links with redirect to referral_page_share campaign', async () => {
    mockApiSuccess();
    const { req, params } = makeRequest('ABC123', {
      redirect: '/en/products',
    });

    const res = await GET(req, { params });

    const location = res.headers.get('location');
    expect(location).toContain('utm_source=referral_link');
    expect(location).toContain('utm_medium=referral');
    expect(location).toContain('utm_campaign=referral_page_share');
  });

  it('preserves explicit share-channel UTM params', async () => {
    mockApiSuccess();
    const { req, params } = makeRequest('ABC123', {
      utm: {
        utm_source: 'telegram',
        utm_medium: 'social',
        utm_campaign: 'referral_invite',
      },
    });

    const res = await GET(req, { params });

    const location = res.headers.get('location');
    expect(location).toContain('utm_source=telegram');
    expect(location).toContain('utm_medium=social');
    expect(location).toContain('utm_campaign=referral_invite');
  });

  it('does not treat Telegram in-app browser as a crawler preview bot', async () => {
    mockApiSuccess();
    const { req, params } = makeRequest('ABC123', {
      userAgent:
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 Telegram-Android/11.7.4',
    });

    const res = await GET(req, { params });

    expect(res.status).toBe(302);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('serves preview HTML to crawler user agents', async () => {
    const { req, params } = makeRequest('ABC123', {
      userAgent:
        'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    });

    const res = await GET(req, { params });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
