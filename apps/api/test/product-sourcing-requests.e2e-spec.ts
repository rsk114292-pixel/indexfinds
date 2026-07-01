import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { User, UserRole } from '../src/users/entities/user.entity';
import {
  ProductSourcingRequest,
  ProductSourcingRequestStatus,
} from '../src/product-sourcing-requests/entities/product-sourcing-request.entity';

describe('ProductSourcingRequests (e2e)', () => {
  let app: INestApplication;
  let usersRepository: Repository<User>;
  let requestsRepository: Repository<ProductSourcingRequest>;
  let userToken: string;
  let adminToken: string;

  const userEmail = 'sourcing-user@example.com';
  const adminEmail = 'sourcing-admin@example.com';
  const password = 'Test123!@#';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    usersRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    requestsRepository = moduleFixture.get<Repository<ProductSourcingRequest>>(
      getRepositoryToken(ProductSourcingRequest),
    );

    await requestsRepository.delete({});
    await usersRepository.delete({ email: userEmail });
    await usersRepository.delete({ email: adminEmail });

    await request(app.getHttpServer()).post('/auth/register').send({
      email: userEmail,
      password,
      username: 'sourcing-user',
    });

    await usersRepository.save({
      email: adminEmail,
      password: await bcrypt.hash(password, 10),
      username: 'sourcing-admin',
      role: UserRole.ADMIN,
      isActive: true,
    });

    const userLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userEmail, password })
      .expect(200);
    userToken = userLogin.body.accessToken as string;

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password })
      .expect(200);
    adminToken = adminLogin.body.accessToken as string;
  });

  afterEach(async () => {
    await requestsRepository.delete({});
  });

  afterAll(async () => {
    await requestsRepository.delete({});
    await usersRepository.delete({ email: userEmail });
    await usersRepository.delete({ email: adminEmail });
    await app.close();
  });

  it('allows an authenticated user to create a sourcing request', async () => {
    const res = await request(app.getHttpServer())
      .post('/product-sourcing-requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        searchQuery: 'nike shox',
        productName: 'Nike Shox TL Black',
        description: 'Need the black pair with silver cage.',
        locale: 'en',
        searchLogId: '550e8400-e29b-41d4-a716-446655440000',
        filtersSnapshot: {
          q: 'nike shox',
          sortBy: 'popular',
        },
      })
      .expect(201);

    expect(res.body).toMatchObject({
      searchQuery: 'nike shox',
      productName: 'Nike Shox TL Black',
      description: 'Need the black pair with silver cage.',
      locale: 'en',
      status: ProductSourcingRequestStatus.NEW,
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.userId).toBeDefined();

    const saved = await requestsRepository.findOne({
      where: { id: res.body.id as string },
    });
    expect(saved).not.toBeNull();
    expect(saved?.productName).toBe('Nike Shox TL Black');
  });

  it('allows an admin to list and update sourcing requests', async () => {
    const created = await request(app.getHttpServer())
      .post('/product-sourcing-requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        searchQuery: 'balenciaga runners',
        productName: 'Balenciaga Runner White',
        description: 'Looking for white/grey colorway.',
        imageUrls: ['https://example.com/reference-1.jpg'],
        locale: 'en',
      })
      .expect(201);

    const listRes = await request(app.getHttpServer())
      .get('/admin/product-sourcing-requests')
      .query({ search: 'balenciaga', hasImages: true })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(listRes.body.total).toBe(1);
    expect(listRes.body.items[0]).toMatchObject({
      id: created.body.id,
      productName: 'Balenciaga Runner White',
      status: ProductSourcingRequestStatus.NEW,
    });
    expect(listRes.body.items[0].user.email).toBe(userEmail);

    const updateRes = await request(app.getHttpServer())
      .patch(`/admin/product-sourcing-requests/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: ProductSourcingRequestStatus.PLANNED,
        adminNotes: 'High-intent query, source next batch.',
        linkedProductId: '8b7a8b7a-8b7a-4b7a-8b7a-8b7a8b7a8b7a',
      })
      .expect(200);

    expect(updateRes.body.status).toBe(ProductSourcingRequestStatus.PLANNED);
    expect(updateRes.body.adminNotes).toBe(
      'High-intent query, source next batch.',
    );
    expect(updateRes.body.linkedProductId).toBe(
      '8b7a8b7a-8b7a-4b7a-8b7a-8b7a8b7a8b7a',
    );
  });
});
