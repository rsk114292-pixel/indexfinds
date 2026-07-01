import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  LoginLog,
  LoginEventType,
  LoginProvider,
} from './entities/login-log.entity';
import { LoginLogService } from './login-log.service';

describe('LoginLogService', () => {
  let service: LoginLogService;
  let repository: Record<string, jest.Mock>;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getCount: jest.fn().mockResolvedValue(0),
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn((data) => ({ id: 'log-1', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginLogService,
        {
          provide: getRepositoryToken(LoginLog),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<LoginLogService>(LoginLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logSuccess', () => {
    it('should create a LOGIN event with provider and geo-location', async () => {
      await service.logSuccess('user-1', '127.0.0.1', 'Mozilla/5.0');

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          eventType: LoginEventType.LOGIN,
          provider: LoginProvider.EMAIL,
          ipAddress: '127.0.0.1',
          geoLocation: 'Local',
          userAgent: 'Mozilla/5.0',
        }),
      );
      expect(repository.save).toHaveBeenCalled();
    });

    it('should use specified provider', async () => {
      await service.logSuccess(
        'user-1',
        '127.0.0.1',
        undefined,
        LoginProvider.GOOGLE,
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: LoginProvider.GOOGLE,
        }),
      );
    });
  });

  describe('logFailure', () => {
    it('should create a FAILED event and can log without userId', async () => {
      await service.logFailure('bad@email.com', '10.0.0.1', 'curl/7.0');

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'bad@email.com',
          eventType: LoginEventType.FAILED,
          provider: LoginProvider.EMAIL,
          ipAddress: '10.0.0.1',
          geoLocation: 'Local',
        }),
      );
      // userId should be undefined (not provided)
      expect(repository.create.mock.calls[0][0].userId).toBeUndefined();
    });

    it('should include userId when provided', async () => {
      await service.logFailure(
        'bad@email.com',
        '10.0.0.1',
        undefined,
        'user-2',
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-2',
          email: 'bad@email.com',
        }),
      );
    });
  });

  describe('logLogout', () => {
    it('should create a LOGOUT event', async () => {
      await service.logLogout('user-1', '192.168.1.1');

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          eventType: LoginEventType.LOGOUT,
        }),
      );
    });
  });

  describe('logOAuth', () => {
    it('should create an OAUTH event with correct provider', async () => {
      await service.logOAuth('user-1', LoginProvider.DISCORD, '8.8.8.8');

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          eventType: LoginEventType.OAUTH,
          provider: LoginProvider.DISCORD,
        }),
      );
    });
  });

  describe('getUserLoginHistory', () => {
    it('should return user logs ordered by createdAt DESC with limit', async () => {
      const mockLogs = [{ id: '1' }, { id: '2' }];
      repository.find.mockResolvedValue(mockLogs);

      const result = await service.getUserLoginHistory('user-1', 10);

      expect(repository.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { createdAt: 'DESC' },
        take: 10,
      });
      expect(result).toEqual(mockLogs);
    });

    it('should default to limit 20', async () => {
      await service.getUserLoginHistory('user-1');

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 }),
      );
    });
  });

  describe('getLoginLogs', () => {
    it('should support pagination', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[{ id: '1' }], 1]);

      const result = await service.getLoginLogs({ page: 2, limit: 10 });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(result).toEqual({
        data: [{ id: '1' }],
        total: 1,
        page: 2,
        limit: 10,
      });
    });

    it('should support filtering by eventType and email', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getLoginLogs({
        eventType: LoginEventType.FAILED,
        email: 'test@',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'log.eventType = :eventType',
        { eventType: LoginEventType.FAILED },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(log.email ILIKE :email OR user.email ILIKE :email)',
        { email: '%test@%' },
      );
    });
  });

  describe('getLoginStats', () => {
    it('should return aggregate counts', async () => {
      repository.count
        .mockResolvedValueOnce(100) // totalLogins
        .mockResolvedValueOnce(20); // totalFailed
      mockQueryBuilder.getCount
        .mockResolvedValueOnce(10) // last24hLogins
        .mockResolvedValueOnce(3); // last24hFailed

      const result = await service.getLoginStats();

      expect(result).toEqual({
        totalLogins: 100,
        totalFailed: 20,
        last24hLogins: 10,
        last24hFailed: 3,
      });
    });
  });
});
