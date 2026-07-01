import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Buy Link (e2e)', () => {
  let app: INestApplication;
  let productId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // 获取一个测试商品
    const products = await request(app.getHttpServer())
      .get('/products?limit=1')
      .expect(200);
    productId = products.body.data?.[0]?.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return buy link for valid product', async () => {
    if (!productId) {
      console.log('No product found, skipping test');
      return;
    }

    const res = await request(app.getHttpServer())
      .get(`/products/${productId}/buy-link`)
      .expect(200);

    expect(res.body.url).toContain('loongbuy.com');
    expect(res.body.url).toContain('invitecode=');
    expect(res.body.platform).toBe('loongbuy');
  });

  it('should return 404 for invalid product', async () => {
    await request(app.getHttpServer())
      .get('/products/00000000-0000-0000-0000-000000000000/buy-link')
      .expect(404);
  });
});
