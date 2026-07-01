import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, Logger } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

/**
 * 认证系统基础 E2E 测试
 * 测试核心认证流程：注册、登录、Token 刷新、登出
 */

// 类型定义
interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    username?: string;
    password?: string;
  };
}

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}

describe('Auth Basic API (e2e)', () => {
  let app: INestApplication<App>;

  const testUser = {
    email: `e2e-test-${Date.now()}@example.com`,
    password: 'Test123!@#',
    username: 'E2E Test User',
  };

  beforeAll(async () => {
    // 禁用日志以减少噪音
    Logger.overrideLogger(false);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // 启用 cookie-parser (必须在 init() 之前)
    app.use(cookieParser());

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('IT-AUTH-001: POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      const body = res.body as AuthResponse;
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('user');
      expect(body.user.email).toBe(testUser.email);
      expect(body.user.password).toBeUndefined();

      // 验证 Refresh Token Cookie
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      const refreshTokenCookie = cookies.find((c: string) =>
        c.startsWith('refresh_token='),
      );
      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toContain('HttpOnly');
    });
  });

  describe('IT-AUTH-002: POST /auth/register - Duplicate Email', () => {
    it('should return 409 for duplicate email', async () => {
      const duplicateEmail = `duplicate-${Date.now()}@example.com`;

      // 第一次注册
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: duplicateEmail,
          password: 'Test123!@#',
        })
        .expect(201);

      // 第二次注册相同邮箱
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: duplicateEmail,
          password: 'Test123!@#',
        })
        .expect(409);

      const body = res.body as ErrorResponse;
      expect(body.message).toBeDefined();
    });
  });

  describe('IT-AUTH-003: POST /auth/login', () => {
    const loginUser = {
      email: `login-${Date.now()}@example.com`,
      password: 'Test123!@#',
    };

    beforeAll(async () => {
      // 先注册用户
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(loginUser)
        .expect(201);
    });

    it('should login successfully with correct credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginUser)
        .expect(200);

      const body = res.body as AuthResponse;
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('user');
      expect(body.user.email).toBe(loginUser.email);
    });

    it('IT-AUTH-004: should return 401 with incorrect password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: loginUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });
  });

  describe('IT-AUTH-005: GET /auth/me', () => {
    let userToken: string;
    const meUser = {
      email: `me-${Date.now()}@example.com`,
      password: 'Test123!@#',
      username: 'Me User',
    };

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(meUser);
      const body = res.body as AuthResponse;
      userToken = body.accessToken;
    });

    it('should return user profile with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const body = res.body as AuthResponse['user'];
      expect(body.email).toBe(meUser.email);
      expect(body.id).toBeDefined();
    });

    it('IT-AUTH-006: should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });
  });

  describe('IT-AUTH-007: POST /auth/refresh', () => {
    let refreshCookie: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `refresh-${Date.now()}@example.com`,
          password: 'Test123!@#',
        });

      const cookies = res.headers['set-cookie'] as unknown as string[];
      refreshCookie = cookies.find((c: string) =>
        c.startsWith('refresh_token='),
      ) as string;
    });

    it('should refresh access token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', refreshCookie)
        .expect(200);

      const body = res.body as AuthResponse;
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('user');
    });

    it('IT-AUTH-008: should return 401 without refresh token', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').expect(401);
    });
  });

  describe('IT-AUTH-009/010: POST /auth/logout', () => {
    let logoutToken: string;
    let logoutCookie: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `logout-${Date.now()}@example.com`,
          password: 'Test123!@#',
        });

      const body = res.body as AuthResponse;
      logoutToken = body.accessToken;
      const cookies = res.headers['set-cookie'] as unknown as string[];
      logoutCookie = cookies.find((c: string) =>
        c.startsWith('refresh_token='),
      ) as string;
    });

    it('should logout successfully', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${logoutToken}`)
        .set('Cookie', logoutCookie)
        .expect(200);

      // IT-AUTH-010: 验证 token 已被列入黑名单
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${logoutToken}`)
        .expect(401);
    });
  });

  describe('IT-AUTH-011: POST /auth/logout-all', () => {
    it('should revoke all user sessions', async () => {
      const user = {
        email: `logoutall-${Date.now()}@example.com`,
        password: 'Test123!@#',
      };

      // 创建两个会话
      const session1 = await request(app.getHttpServer())
        .post('/auth/register')
        .send(user);

      const session2 = await request(app.getHttpServer())
        .post('/auth/login')
        .send(user);

      const session1Body = session1.body as AuthResponse;

      // 使用第一个会话登出所有设备
      await request(app.getHttpServer())
        .post('/auth/logout-all')
        .set('Authorization', `Bearer ${session1Body.accessToken}`)
        .expect(200);

      // 验证第二个会话的 refresh token 也被撤销
      const cookies2 = session2.headers['set-cookie'] as unknown as string[];
      const cookie2 = cookies2.find((c: string) =>
        c.startsWith('refresh_token='),
      ) as string;

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookie2)
        .expect(401);
    });
  });

  describe('IT-AUTH-012: Cookie Security', () => {
    it('should set secure cookie attributes', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `cookie-${Date.now()}@example.com`,
          password: 'Test123!@#',
        });

      const cookies = res.headers['set-cookie'] as unknown as string[];
      const refreshTokenCookie = cookies.find((c: string) =>
        c.startsWith('refresh_token='),
      ) as string;

      expect(refreshTokenCookie).toContain('HttpOnly');
      expect(refreshTokenCookie).toContain('SameSite=Lax');
      expect(refreshTokenCookie).toContain('Path=/');
    });
  });
});
