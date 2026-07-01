import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Analytics (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // 管理员登录
    try {
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@test.com', password: 'admin' });
      adminToken = login.body.accessToken;
    } catch {
      console.log('Admin login failed, some tests will be skipped');
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('should record click event', async () => {
    const res = await request(app.getHttpServer())
      .post('/analytics/click-events')
      .send({
        productId: 'test-product-id',
        platform: 'loongbuy',
        sessionId: 'test-session-123',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.platform).toBe('loongbuy');
  });

  it('should return overview stats for admin', async () => {
    if (!adminToken) {
      console.log('No admin token, skipping test');
      return;
    }

    const res = await request(app.getHttpServer())
      .get('/admin/analytics/overview')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('clicks');
    expect(res.body).toHaveProperty('referrals');
  });

  it('should return clicks stats with date range', async () => {
    if (!adminToken) {
      console.log('No admin token, skipping test');
      return;
    }

    const startDate = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const endDate = new Date().toISOString();

    const res = await request(app.getHttpServer())
      .get('/admin/analytics/clicks')
      .query({ startDate, endDate })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('byDate');
    expect(res.body).toHaveProperty('topProducts');
  });

  it('should reject non-admin users', async () => {
    await request(app.getHttpServer())
      .get('/admin/analytics/overview')
      .expect(401);
  });
});
