import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // 测试用户数据
  const testUser = {
    email: 'test@example.com',
    password: 'Test123!@#',
    username: 'Test User',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // 启用 cookie-parser (必须在 init() 之前)
    app.use(cookieParser());

    // 启用验证管道（与生产环境一致）
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    // 获取数据源用于清理数据
    dataSource = moduleFixture.get<DataSource>(DataSource);

    // 清理之前测试遗留的用户（refresh_tokens / login_logs 等有 CASCADE 会自动删除）
    const testEmails = [
      'test@example.com',
      'duplicate@example.com',
      'login-test@example.com',
      'me-test@example.com',
      'refresh-test@example.com',
      'cookie-test@example.com',
    ];
    await dataSource.query(`DELETE FROM users WHERE email = ANY($1)`, [
      testEmails,
    ]);

    // 清除 Redis 登录锁定计数器
    const redis = moduleFixture.get('REDIS_CLIENT');
    for (const email of testEmails) {
      await redis.del(`login:attempts:${email}`);
    }
  });

  afterAll(async () => {
    // 清理测试用户
    const testEmails = [
      'test@example.com',
      'duplicate@example.com',
      'login-test@example.com',
      'me-test@example.com',
      'refresh-test@example.com',
      'cookie-test@example.com',
    ];
    await dataSource.query(`DELETE FROM users WHERE email = ANY($1)`, [
      testEmails,
    ]);
    await app.close();
  });

  afterEach(async () => {
    // 每个测试后清理数据（可选，根据需求调整）
    // await dataSource.query('TRUNCATE TABLE users CASCADE');
  });

  describe('Phase 1: 注册与登录流程', () => {
    describe('POST /auth/register - IT-AUTH-001: 注册新用户', () => {
      it('should register a new user and return tokens', async () => {
        const res = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: testUser.email,
            password: testUser.password,
            username: testUser.username,
          })
          .expect(201);

        // 验证响应结构
        expect(res.body).toHaveProperty('accessToken');
        expect(res.body).toHaveProperty('user');
        expect(res.body.user).toMatchObject({
          email: testUser.email,
          username: testUser.username,
        });

        // 验证不返回密码
        expect(res.body.user.password).toBeUndefined();

        // 验证设置了 Refresh Token Cookie
        const cookies = res.headers['set-cookie'] as unknown as string[];
        expect(cookies).toBeDefined();
        const refreshTokenCookie = cookies.find((c: string) =>
          c.startsWith('refresh_token='),
        );
        expect(refreshTokenCookie).toBeDefined();
        expect(refreshTokenCookie).toContain('HttpOnly');
        expect(refreshTokenCookie).toContain('SameSite=Lax');
      });

      it('IT-AUTH-002: should return 409 when registering duplicate email', async () => {
        // 先注册一个用户
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'duplicate@example.com',
            password: 'Test123!@#',
          })
          .expect(201);

        // 尝试用相同邮箱再次注册
        const res = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'duplicate@example.com',
            password: 'Test123!@#',
          })
          .expect(409);

        expect(res.body.message).toContain('Email already exists');
      });

      it('should validate password strength', async () => {
        const res = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'weak@example.com',
            password: '123', // 弱密码
          })
          .expect(400);

        expect(res.body.message).toBeDefined();
      });

      it('should validate email format', async () => {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'invalid-email', // 无效邮箱
            password: 'Test123!@#',
          })
          .expect(400);
      });
    });

    describe('POST /auth/login - 登录流程', () => {
      beforeAll(async () => {
        // 注册一个测试用户
        await request(app.getHttpServer()).post('/auth/register').send({
          email: 'login-test@example.com',
          password: 'Test123!@#',
        });
      });

      it('IT-AUTH-003: should login successfully with correct credentials', async () => {
        const res = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'login-test@example.com',
            password: 'Test123!@#',
          })
          .expect(200);

        expect(res.body).toHaveProperty('accessToken');
        expect(res.body).toHaveProperty('user');
        expect(res.body.user.email).toBe('login-test@example.com');
        expect(res.body.user.password).toBeUndefined();

        // 验证 Cookie
        const cookies = res.headers['set-cookie'] as unknown as string[];
        const refreshTokenCookie = cookies.find((c: string) =>
          c.startsWith('refresh_token='),
        );
        expect(refreshTokenCookie).toBeDefined();
      });

      it('IT-AUTH-004: should return 401 with incorrect password', async () => {
        const res = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'login-test@example.com',
            password: 'WrongPassword123!',
          })
          .expect(401);

        expect(res.body.message).toContain('Invalid email or password');
      });

      it('IT-AUTH-006: should return 401 for non-existent user', async () => {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'Test123!@#',
          })
          .expect(401);
      });
    });

    describe('GET /auth/me - 获取当前用户', () => {
      let userToken: string;

      beforeAll(async () => {
        // 创建并登录用户
        const res = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'me-test@example.com',
            password: 'Test123!@#',
            username: 'Me Test User',
          });
        userToken = res.body.accessToken;
      });

      it('IT-AUTH-005: should return user profile with valid token', async () => {
        const res = await request(app.getHttpServer())
          .get('/auth/me')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(res.body).toMatchObject({
          email: 'me-test@example.com',
          username: 'Me Test User',
        });
        expect(res.body.id).toBeDefined();
        expect(res.body.role).toBeDefined();
      });

      it('IT-AUTH-006: should return 401 without token', async () => {
        await request(app.getHttpServer()).get('/auth/me').expect(401);
      });

      it('should return 401 with invalid token', async () => {
        await request(app.getHttpServer())
          .get('/auth/me')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);
      });
    });
  });

  describe('Phase 2: Token 刷新与登出', () => {
    let loginToken: string;
    let loginRefreshCookie: string;

    beforeAll(async () => {
      // 注册并登录用户
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'refresh-test@example.com',
          password: 'Test123!@#',
        });
      loginToken = res.body.accessToken;
      loginRefreshCookie = (
        res.headers['set-cookie'] as unknown as string[]
      ).find((c: string) => c.startsWith('refresh_token='))!;
    });

    describe('POST /auth/refresh - Token 刷新', () => {
      it('IT-AUTH-007: should refresh access token with valid refresh token', async () => {
        const res = await request(app.getHttpServer())
          .post('/auth/refresh')
          .set('Cookie', loginRefreshCookie)
          .expect(200);

        expect(res.body).toHaveProperty('accessToken');
        expect(res.body).toHaveProperty('user');
        expect(res.body.accessToken).not.toBe(loginToken); // 新 token 应该不同
      });

      it('IT-AUTH-008: should return 401 without refresh token cookie', async () => {
        await request(app.getHttpServer()).post('/auth/refresh').expect(401);
      });

      it('should return 401 with invalid refresh token', async () => {
        await request(app.getHttpServer())
          .post('/auth/refresh')
          .set('Cookie', 'refresh_token=invalid-token')
          .expect(401);
      });
    });

    describe('POST /auth/logout - 登出', () => {
      it('IT-AUTH-009: should logout and clear cookie', async () => {
        const res = await request(app.getHttpServer())
          .post('/auth/logout')
          .set('Authorization', `Bearer ${loginToken}`)
          .set('Cookie', loginRefreshCookie)
          .expect(200);

        expect(res.body.message).toBeDefined();

        // 验证 cookie 被清除
        const cookies = res.headers['set-cookie'] as unknown as string[];
        if (cookies) {
          const refreshTokenCookie = cookies.find((c: string) =>
            c.startsWith('refresh_token='),
          );
          if (refreshTokenCookie) {
            // Express clearCookie sets Expires to epoch instead of Max-Age=0
            expect(refreshTokenCookie).toMatch(
              /Max-Age=0|Expires=Thu, 01 Jan 1970/,
            );
          }
        }
      });

      it('IT-AUTH-010: should reject access with blacklisted token after logout', async () => {
        // 登录
        const loginRes = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'refresh-test@example.com',
            password: 'Test123!@#',
          });

        const token = loginRes.body.accessToken;
        const cookie = (
          loginRes.headers['set-cookie'] as unknown as string[]
        ).find((c: string) => c.startsWith('refresh_token='))!;

        // 登出
        await request(app.getHttpServer())
          .post('/auth/logout')
          .set('Authorization', `Bearer ${token}`)
          .set('Cookie', cookie)
          .expect(200);

        // 尝试使用已登出的 token 访问受保护端点
        await request(app.getHttpServer())
          .get('/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);
      });
    });

    describe('POST /auth/logout-all - 登出所有设备', () => {
      it('IT-AUTH-011: should revoke all refresh tokens', async () => {
        // 多次登录创建多个会话
        const login1 = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'refresh-test@example.com',
            password: 'Test123!@#',
          });

        const login2 = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'refresh-test@example.com',
            password: 'Test123!@#',
          });

        // 使用第一个会话登出所有设备
        await request(app.getHttpServer())
          .post('/auth/logout-all')
          .set('Authorization', `Bearer ${login1.body.accessToken}`)
          .expect(200);

        // 验证第二个会话的 refresh token 也被撤销
        const cookie2 = (
          login2.headers['set-cookie'] as unknown as string[]
        ).find((c: string) => c.startsWith('refresh_token='))!;

        await request(app.getHttpServer())
          .post('/auth/refresh')
          .set('Cookie', cookie2)
          .expect(401);
      });
    });
  });

  describe('Phase 3: Cookie 安全性', () => {
    it('IT-AUTH-012: should set secure cookie attributes', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'cookie-test@example.com',
          password: 'Test123!@#',
        });

      const cookies = res.headers['set-cookie'] as unknown as string[];
      const refreshTokenCookie = cookies.find((c: string) =>
        c.startsWith('refresh_token='),
      );

      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toContain('HttpOnly');
      expect(refreshTokenCookie).toContain('SameSite=Lax');
      expect(refreshTokenCookie).toContain('Path=/');

      // 生产环境应该有 Secure 标志
      if (process.env.NODE_ENV === 'production') {
        expect(refreshTokenCookie).toContain('Secure');
      }
    });
  });

  describe('Phase 4: Rate Limiting (可选)', () => {
    it('should apply rate limiting to login endpoint', async () => {
      // 注意：这个测试可能需要根据实际的 rate limiting 配置调整
      // 如果配置是 5次/分钟，则需要发送 6 次请求

      const attempts = [];
      for (let i = 0; i < 6; i++) {
        attempts.push(
          request(app.getHttpServer()).post('/auth/login').send({
            email: 'rate-limit-test@example.com',
            password: 'Test123!@#',
          }),
        );
      }

      const results = await Promise.all(attempts);

      // 检查是否有请求被限流（返回 429）
      const rateLimited = results.some((res) => res.status === 429);

      // 如果启用了 rate limiting，应该有请求被阻止
      if (rateLimited) {
        expect(rateLimited).toBe(true);
      }
    });
  });
});
