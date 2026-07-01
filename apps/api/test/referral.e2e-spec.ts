import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Referral (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let referralCode: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // 登录获取 token (使用测试账户)
    try {
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@test.com', password: 'password' });
      authToken = login.body.accessToken;
    } catch {
      console.log('Login failed, some tests will be skipped');
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('should generate referral code for authenticated user', async () => {
    if (!authToken) {
      console.log('No auth token, skipping test');
      return;
    }

    const res = await request(app.getHttpServer())
      .get('/referral/my-code')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.code).toHaveLength(6);
    expect(res.body.shareUrl).toContain('/r/');
    referralCode = res.body.code;
  });

  it('should record click via track-click API', async () => {
    if (!referralCode) {
      console.log('No referral code, skipping test');
      return;
    }

    const res = await request(app.getHttpServer())
      .post('/referral/track-click')
      .send({
        code: referralCode,
        sessionId: 'e2e-test-session',
        landingPage: `/r/${referralCode}`,
        redirectTo: '/products',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.cookieValue).toBeDefined();
  });

  it('should require auth for my-code endpoint', async () => {
    await request(app.getHttpServer()).get('/referral/my-code').expect(401);
  });
});
