/**
 * @jest-environment node
 *
 * /api/revalidate 路由鉴权测试
 * 验证只有管理员 JWT 才能清除 ISR 缓存
 */

// mock next/cache（Next.js 服务端函数，Jest 环境中无法运行）
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

import { POST, GET } from './route';
import { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

const API_URL = 'http://localhost:4101';

function makeRequest(
  method: 'POST' | 'GET',
  opts: {
    body?: object;
    authHeader?: string;
    secretHeader?: string;
    searchParams?: Record<string, string>;
  } = {},
): NextRequest {
  const url = new URL(`http://localhost/api/revalidate`);
  if (opts.searchParams) {
    Object.entries(opts.searchParams).forEach(([k, v]) =>
      url.searchParams.set(k, v),
    );
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (opts.authHeader) {
    headers['Authorization'] = opts.authHeader;
  }
  if (opts.secretHeader) {
    headers['x-revalidate-secret'] = opts.secretHeader;
  }

  return new NextRequest(url.toString(), {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
}

// 模拟 NestJS /auth/me 的 fetch 响应
function mockAuthMe(user: { role: string } | null) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: user !== null,
    json: async () => user ?? {},
  });
}

describe('POST /api/revalidate — 鉴权', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    process.env.NEXT_PUBLIC_API_URL = API_URL;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('无 Authorization header → 401', async () => {
    const res = await POST(makeRequest('POST', { body: { all: true } }));
    expect(res.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled(); // 无 header 时不请求 auth/me
  });

  it('auth/me 返回 401（token 无效）→ 401', async () => {
    mockAuthMe(null); // ok: false
    const res = await POST(
      makeRequest('POST', {
        authHeader: 'Bearer invalid-token',
        body: { all: true },
      }),
    );
    expect(res.status).toBe(401);
  });

  it('普通用户 role=user → 401', async () => {
    mockAuthMe({ role: 'user' });
    const res = await POST(
      makeRequest('POST', {
        authHeader: 'Bearer user-token',
        body: { all: true },
      }),
    );
    expect(res.status).toBe(401);
  });

  it('管理员 role=admin → 200', async () => {
    mockAuthMe({ role: 'admin' });
    const res = await POST(
      makeRequest('POST', {
        authHeader: 'Bearer admin-token',
        body: { all: true },
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('超级管理员 role=super_admin → 200', async () => {
    mockAuthMe({ role: 'super_admin' });
    const res = await POST(
      makeRequest('POST', {
        authHeader: 'Bearer super-token',
        body: { slug: 'nike-air-max' },
      }),
    );
    expect(res.status).toBe(200);
  });
});

describe('POST /api/revalidate — secret 鉴权', () => {
  const TEST_SECRET = 'test-secret-abc123';

  beforeEach(() => {
    global.fetch = jest.fn();
    process.env.NEXT_PUBLIC_API_URL = API_URL;
    process.env.REVALIDATE_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.REVALIDATE_SECRET;
  });

  it('正确 secret → 200，不请求 auth/me', async () => {
    const res = await POST(
      makeRequest('POST', {
        secretHeader: TEST_SECRET,
        body: { slug: 'nike-air-max' },
      }),
    );
    expect(res.status).toBe(200);
    expect(global.fetch).not.toHaveBeenCalled(); // secret 验证不走 auth/me
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(revalidateTag).toHaveBeenCalledWith('product-detail:nike-air-max');
  });

  it('错误 secret → 401', async () => {
    const res = await POST(
      makeRequest('POST', {
        secretHeader: 'wrong-secret',
        body: { slug: 'nike-air-max' },
      }),
    );
    expect(res.status).toBe(401);
  });
});

describe('GET /api/revalidate — 鉴权', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    process.env.NEXT_PUBLIC_API_URL = API_URL;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('无 Authorization header → 401', async () => {
    const res = await GET(
      makeRequest('GET', { searchParams: { slug: 'some-product' } }),
    );
    expect(res.status).toBe(401);
  });

  it('管理员 → 200', async () => {
    mockAuthMe({ role: 'admin' });
    const res = await GET(
      makeRequest('GET', {
        authHeader: 'Bearer admin-token',
        searchParams: { slug: 'nike-air-max' },
      }),
    );
    expect(res.status).toBe(200);
  });
});
