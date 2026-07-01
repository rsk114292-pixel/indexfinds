import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Brand } from '../src/brands/entities/brand.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from '../src/users/entities/user.entity';

describe('BrandsController (e2e)', () => {
  let app: INestApplication<App>;
  let brandsRepository: Repository<Brand>;
  let usersRepository: Repository<User>;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // 添加全局验证管道（与实际应用保持一致）
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();

    brandsRepository = moduleFixture.get<Repository<Brand>>(
      getRepositoryToken(Brand),
    );
    usersRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );

    const email = 'e2e-admin@example.com';
    const password = 'e2e-admin-password';

    // 清理之前遗留的测试用户
    await usersRepository.delete({ email });

    await usersRepository.save({
      email,
      password: await bcrypt.hash(password, 10),
      username: 'e2e-admin',
      role: UserRole.ADMIN,
      isActive: true,
    });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    adminToken = loginRes.body.accessToken as string;
  });

  afterAll(async () => {
    // 清理测试数据
    try {
      const brands = await brandsRepository.find();
      if (brands.length > 0) {
        await brandsRepository.remove(brands);
      }
    } catch (error) {
      console.error('清理测试数据失败:', error);
    }
    await app.close();
  });

  afterEach(async () => {
    // 每个测试后清理数据
    try {
      const brands = await brandsRepository.find();
      if (brands.length > 0) {
        await brandsRepository.remove(brands);
      }
    } catch (error) {
      console.error('清理测试数据失败:', error);
    }
  });

  describe('/brands (POST)', () => {
    it('应该成功创建品牌', () => {
      return request(app.getHttpServer())
        .post('/brands')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Nike',
          slug: 'nike',
          aliases: ['耐克', 'NIKE官方'],
          tier: 1,
          description: '全球知名运动品牌',
        })
        .expect(201)
        .expect((res) => {
          const body = res.body as unknown as Brand;
          expect(body).toHaveProperty('id');
          expect(body.name).toBe('Nike');
          expect(body.slug).toBe('nike');
          expect(body.status).toBe('active');
        });
    });

    it('应该在缺少必填字段时返回 400', () => {
      return request(app.getHttpServer())
        .post('/brands')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          slug: 'nike',
          // 缺少 name
        })
        .expect(400);
    });

    it('应该在品牌名称重复时返回 409', async () => {
      // 先创建一个品牌
      await request(app.getHttpServer())
        .post('/brands')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Nike',
          slug: 'nike',
        });

      // 尝试创建同名品牌
      return request(app.getHttpServer())
        .post('/brands')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Nike',
          slug: 'nike-2',
        })
        .expect(409);
    });
  });

  describe('/brands (GET)', () => {
    beforeEach(async () => {
      // 准备测试数据
      await brandsRepository.save([
        {
          name: 'Nike',
          slug: 'nike',
          aliases: ['耐克'],
          tier: 1,
          status: 'active',
        },
        {
          name: 'Adidas',
          slug: 'adidas',
          aliases: ['阿迪达斯'],
          tier: 1,
          status: 'active',
        },
        {
          name: 'Puma',
          slug: 'puma',
          tier: 2,
          status: 'inactive',
        },
      ]);
    });

    it('应该返回所有品牌', () => {
      return request(app.getHttpServer())
        .get('/brands')
        .expect(200)
        .expect((res) => {
          const body = res.body as unknown as { data: Brand[] };
          expect(Array.isArray(body.data)).toBe(true);
          // GET /brands 默认排除 inactive 状态，只返回 active/merged/rejected
          expect(body.data.length).toBe(2);
        });
    });

    it('应该根据状态筛选品牌', () => {
      return request(app.getHttpServer())
        .get('/brands?status=active')
        .expect(200)
        .expect((res) => {
          const body = res.body as unknown as { data: Brand[] };
          expect(body.data.length).toBe(2);
          expect(body.data.every((b) => b.status === 'active')).toBe(true);
        });
    });

    it('应该根据搜索关键词筛选品牌', () => {
      return request(app.getHttpServer())
        .get('/brands?search=Nike')
        .expect(200)
        .expect((res) => {
          const body = res.body as unknown as { data: Brand[] };
          expect(body.data.length).toBeGreaterThanOrEqual(1);
          expect(body.data[0]?.name).toContain('Nike');
        });
    });

    it('应该支持 q 参数进行关键词搜索', () => {
      return request(app.getHttpServer())
        .get('/brands?q=Nike')
        .expect(200)
        .expect((res) => {
          const body = res.body as unknown as { data: Brand[] };
          expect(body.data.length).toBeGreaterThanOrEqual(1);
          expect(body.data.some((b) => b.name.includes('Nike'))).toBe(true);
        });
    });

    it('应该根据别名搜索品牌', () => {
      return request(app.getHttpServer())
        .get('/brands?search=耐克')
        .expect(200)
        .expect((res) => {
          const body = res.body as unknown as { data: Brand[] };
          expect(body.data.length).toBeGreaterThanOrEqual(1);
          expect(body.data[0]?.name).toBe('Nike');
        });
    });

    it('q 与 search 值不同应返回 400', () => {
      return request(app.getHttpServer())
        .get('/brands?q=Nike&search=Adidas')
        .expect(400);
    });
  });

  describe('/brands/:id (GET)', () => {
    let brandId: string;

    beforeEach(async () => {
      const brand = await brandsRepository.save({
        name: 'Nike',
        slug: 'nike',
      });
      brandId = brand.id;
    });

    it('应该返回指定品牌', () => {
      return request(app.getHttpServer())
        .get(`/brands/${brandId}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as unknown as Brand;
          expect(body.id).toBe(brandId);
          expect(body.name).toBe('Nike');
        });
    });

    it('应该在品牌不存在时返回 404', () => {
      return request(app.getHttpServer())
        .get('/brands/550e8400-e29b-41d4-a716-446655440000')
        .expect(404);
    });
  });

  describe('/brands/:id (PATCH)', () => {
    let brandId: string;

    beforeEach(async () => {
      const brand = await brandsRepository.save({
        name: 'Nike',
        slug: 'nike',
        tier: 1,
      });
      brandId = brand.id;
    });

    it('应该成功更新品牌', () => {
      return request(app.getHttpServer())
        .patch(`/brands/${brandId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tier: 2,
          description: '更新后的描述',
        })
        .expect(200)
        .expect((res) => {
          const body = res.body as unknown as Brand;
          expect(body.tier).toBe(2);
          expect(body.description).toBe('更新后的描述');
        });
    });

    it('应该在品牌不存在时返回 404', () => {
      return request(app.getHttpServer())
        .patch('/brands/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tier: 2 })
        .expect(404);
    });
  });

  describe('/brands/:id (DELETE)', () => {
    let brandId: string;

    beforeEach(async () => {
      const brand = await brandsRepository.save({
        name: 'Nike',
        slug: 'nike',
      });
      brandId = brand.id;
    });

    it('应该成功删除品牌（硬删除）', async () => {
      await request(app.getHttpServer())
        .delete(`/brands/${brandId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // 验证品牌已从数据库中删除
      const brand = await brandsRepository.findOne({ where: { id: brandId } });
      expect(brand).toBeNull();
    });

    it('应该在品牌不存在时返回 404', () => {
      return request(app.getHttpServer())
        .delete('/brands/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('/brands/:sourceId/merge/:targetId (POST)', () => {
    let sourceBrandId: string;
    let targetBrandId: string;

    beforeEach(async () => {
      const sourceBrand = await brandsRepository.save({
        name: 'Nike',
        slug: 'nike',
      });
      const targetBrand = await brandsRepository.save({
        name: 'Adidas',
        slug: 'adidas',
      });
      sourceBrandId = sourceBrand.id;
      targetBrandId = targetBrand.id;
    });

    it('应该成功合并品牌', async () => {
      await request(app.getHttpServer())
        .post(`/brands/${sourceBrandId}/merge/${targetBrandId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201)
        .expect((res) => {
          const body = res.body as unknown as Brand;
          expect(body.mergedIntoId).toBe(targetBrandId);
          expect(body.status).toBe('merged');
        });

      // 验证源品牌已被标记为 merged
      const sourceBrand = await brandsRepository.findOne({
        where: { id: sourceBrandId },
      });
      expect(sourceBrand?.status).toBe('merged');
    });

    it('应该在源品牌不存在时返回 404', () => {
      return request(app.getHttpServer())
        .post(
          `/brands/550e8400-e29b-41d4-a716-446655440000/merge/${targetBrandId}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('应该在目标品牌不存在时返回 404', () => {
      return request(app.getHttpServer())
        .post(
          `/brands/${sourceBrandId}/merge/550e8400-e29b-41d4-a716-446655440000`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
