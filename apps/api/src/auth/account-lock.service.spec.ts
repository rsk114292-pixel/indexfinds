import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { AccountLockService } from './account-lock.service';
import { User, UserRole } from '../users/entities/user.entity';

describe('AccountLockService', () => {
  let service: AccountLockService;
  let userRepository: Record<string, jest.Mock>;
  let redis: Record<string, jest.Mock>;

  const createMockUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 'user-1',
      email: 'test@test.com',
      password: 'hashed',
      role: UserRole.USER,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      ...overrides,
    }) as User;

  beforeEach(async () => {
    userRepository = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
    };

    redis = {
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
      get: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountLockService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: redis,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                MAX_LOGIN_ATTEMPTS: '5',
                LOCK_DURATION_MINUTES: '30',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AccountLockService>(AccountLockService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('configuration', () => {
    it('should respect custom MAX_LOGIN_ATTEMPTS from env', async () => {
      // Create a service with custom config: 3 attempts
      const customModule = await Test.createTestingModule({
        providers: [
          AccountLockService,
          { provide: getRepositoryToken(User), useValue: userRepository },
          { provide: 'REDIS_CLIENT', useValue: redis },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'MAX_LOGIN_ATTEMPTS') return '3';
                if (key === 'LOCK_DURATION_MINUTES') return '15';
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      const customService =
        customModule.get<AccountLockService>(AccountLockService);

      // 3rd attempt should trigger lock (custom threshold = 3)
      redis.incr.mockResolvedValue(3);
      const user = createMockUser();
      await customService.recordFailure('test@test.com', user);

      expect(userRepository.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          lockedUntil: expect.any(Date),
          failedLoginAttempts: 3,
        }),
      );
    });

    it('should read correct env var keys (MAX_LOGIN_ATTEMPTS, LOCK_DURATION_MINUTES)', async () => {
      const getMock = jest.fn().mockReturnValue(undefined);
      await Test.createTestingModule({
        providers: [
          AccountLockService,
          { provide: getRepositoryToken(User), useValue: userRepository },
          { provide: 'REDIS_CLIENT', useValue: redis },
          { provide: ConfigService, useValue: { get: getMock } },
        ],
      }).compile();

      expect(getMock).toHaveBeenCalledWith('MAX_LOGIN_ATTEMPTS');
      expect(getMock).toHaveBeenCalledWith('LOCK_DURATION_MINUTES');
    });
  });

  describe('checkLocked', () => {
    it('should pass if user is not locked', async () => {
      const user = createMockUser();
      await expect(service.checkLocked(user)).resolves.toBeUndefined();
    });

    it('should throw ForbiddenException with remaining minutes if locked', async () => {
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
      const user = createMockUser({ lockedUntil });

      await expect(service.checkLocked(user)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should clear lock and pass if lockedUntil has expired', async () => {
      const lockedUntil = new Date(Date.now() - 60 * 1000); // 1 minute ago
      const user = createMockUser({ lockedUntil });

      await expect(service.checkLocked(user)).resolves.toBeUndefined();

      // Should have cleared the lock in DB
      expect(userRepository.update).toHaveBeenCalledWith(user.id, {
        lockedUntil: null,
        failedLoginAttempts: 0,
      });
    });
  });

  describe('recordFailure', () => {
    it('should increment Redis counter', async () => {
      redis.incr.mockResolvedValue(1);

      const result = await service.recordFailure('test@test.com');

      expect(redis.incr).toHaveBeenCalledWith('login:attempts:test@test.com');
      expect(result).toBe(1);
    });

    it('should set TTL on first attempt', async () => {
      redis.incr.mockResolvedValue(1);

      await service.recordFailure('test@test.com');

      expect(redis.expire).toHaveBeenCalledWith(
        'login:attempts:test@test.com',
        1800,
      );
    });

    it('should lock account on 5th failure', async () => {
      redis.incr.mockResolvedValue(5);
      const user = createMockUser();

      await service.recordFailure('test@test.com', user);

      expect(userRepository.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          lockedUntil: expect.any(Date),
          failedLoginAttempts: 5,
        }),
      );
    });

    it('should fall back to DB counting when Redis unavailable', async () => {
      redis.incr.mockRejectedValue(new Error('Redis down'));
      const user = createMockUser({ failedLoginAttempts: 3 });

      const result = await service.recordFailure('test@test.com', user);

      expect(result).toBe(4); // 3 + 1
    });

    it('should return current attempt count', async () => {
      redis.incr.mockResolvedValue(3);
      const user = createMockUser();

      const result = await service.recordFailure('test@test.com', user);

      expect(result).toBe(3);
    });
  });

  describe('clearAttempts', () => {
    it('should delete Redis counter and reset DB failedLoginAttempts', async () => {
      const user = createMockUser({ failedLoginAttempts: 3 });

      await service.clearAttempts('test@test.com', user);

      expect(redis.del).toHaveBeenCalledWith('login:attempts:test@test.com');
      expect(userRepository.update).toHaveBeenCalledWith('user-1', {
        failedLoginAttempts: 0,
      });
    });

    it('should handle Redis failure gracefully', async () => {
      redis.del.mockRejectedValue(new Error('Redis down'));
      const user = createMockUser({ failedLoginAttempts: 2 });

      // Should not throw
      await expect(
        service.clearAttempts('test@test.com', user),
      ).resolves.toBeUndefined();

      // DB update should still happen
      expect(userRepository.update).toHaveBeenCalled();
    });

    it('should skip DB update if failedLoginAttempts is already 0', async () => {
      const user = createMockUser({ failedLoginAttempts: 0 });

      await service.clearAttempts('test@test.com', user);

      expect(userRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('getRemainingAttempts', () => {
    it('should return MAX_ATTEMPTS minus current count', async () => {
      redis.get.mockResolvedValue('3');

      const result = await service.getRemainingAttempts('test@test.com');

      expect(result).toBe(2); // 5 - 3
    });

    it('should return MAX_ATTEMPTS when Redis unavailable', async () => {
      redis.get.mockRejectedValue(new Error('Redis down'));

      const result = await service.getRemainingAttempts('test@test.com');

      expect(result).toBe(5);
    });

    it('should return MAX_ATTEMPTS when no attempts recorded', async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.getRemainingAttempts('test@test.com');

      expect(result).toBe(5);
    });
  });

  describe('unlockAccount', () => {
    it('should clear lockedUntil and failedLoginAttempts', async () => {
      const user = createMockUser({
        lockedUntil: new Date(),
        failedLoginAttempts: 5,
      });
      userRepository.findOne.mockResolvedValue(user);

      await service.unlockAccount('user-1');

      expect(userRepository.update).toHaveBeenCalledWith('user-1', {
        lockedUntil: null,
        failedLoginAttempts: 0,
      });
    });

    it('should do nothing if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await service.unlockAccount('nonexistent');

      expect(userRepository.update).not.toHaveBeenCalled();
    });
  });
});
