import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LockService } from './lock.service';

// Mock ioredis
const mockRedis = {
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  pexpire: jest.fn(),
  eval: jest.fn(),
  quit: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis);
});

describe('LockService', () => {
  let service: LockService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LockService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal: any) => defaultVal),
          },
        },
      ],
    }).compile();

    service = module.get<LockService>(LockService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('acquireLock', () => {
    it('should return true when lock is acquired', async () => {
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.acquireLock('test-key');

      expect(result).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'lock:test-key',
        expect.any(String),
        'PX',
        30000,
        'NX',
      );
    });

    it('should return false when lock is already held', async () => {
      mockRedis.set.mockResolvedValue(null);

      const result = await service.acquireLock('test-key');

      expect(result).toBe(false);
    });

    it('should return true (fail-open) on Redis error', async () => {
      mockRedis.set.mockRejectedValue(new Error('connection refused'));

      const result = await service.acquireLock('test-key');

      // fail-open: Redis 不可用时放行，依赖业务层防重复
      expect(result).toBe(true);
    });

    it('should store lock value in lockValues map on success', async () => {
      mockRedis.set.mockResolvedValue('OK');

      await service.acquireLock('test-key');

      // Verify by releasing — if value was stored, eval should be called
      mockRedis.eval.mockResolvedValue(1);
      await service.releaseLock('test-key');

      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.stringContaining('redis.call("GET"'),
        1,
        'lock:test-key',
        expect.any(String),
      );
    });
  });

  describe('claimOnce', () => {
    it('should return true when claim is acquired', async () => {
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.claimOnce('analytics-key', 60_000);

      expect(result).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'lock:claim:analytics-key',
        '1',
        'PX',
        60_000,
        'NX',
      );
    });

    it('should fail closed by default on Redis error', async () => {
      mockRedis.set.mockRejectedValue(new Error('connection refused'));

      const result = await service.claimOnce('analytics-key', 60_000);

      expect(result).toBe(false);
    });

    it('should support explicit fail-open fallback when requested', async () => {
      mockRedis.set.mockRejectedValue(new Error('connection refused'));

      const result = await service.claimOnce('analytics-key', 60_000, {
        onUnavailable: 'open',
      });

      expect(result).toBe(true);
    });
  });

  describe('releaseLock', () => {
    it('should use Lua script for atomic check-and-delete', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.eval.mockResolvedValue(1);

      await service.acquireLock('test-key');
      await service.releaseLock('test-key');

      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.stringContaining('redis.call("DEL"'),
        1,
        'lock:test-key',
        expect.any(String),
      );
    });

    it('should skip release when no lock value is stored', async () => {
      // Never acquired, so no value stored
      await service.releaseLock('unknown-key');

      expect(mockRedis.eval).not.toHaveBeenCalled();
    });

    it('should clean up lockValues map after release', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.eval.mockResolvedValue(1);

      await service.acquireLock('test-key');
      await service.releaseLock('test-key');

      // Second release should skip (value already removed)
      await service.releaseLock('test-key');

      expect(mockRedis.eval).toHaveBeenCalledTimes(1);
    });
  });

  describe('withLock', () => {
    it('should execute function and return result when lock is acquired', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.eval.mockResolvedValue(1);

      const result = await service.withLock('test-key', () =>
        Promise.resolve('hello'),
      );

      expect(result).toEqual({ success: true, result: 'hello' });
    });

    it('should return failure when lock cannot be acquired', async () => {
      mockRedis.set.mockResolvedValue(null);

      const result = await service.withLock('test-key', () =>
        Promise.resolve('hello'),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should re-throw exception instead of swallowing it', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.eval.mockResolvedValue(1);

      await expect(
        service.withLock('test-key', () => {
          throw new Error('business logic failed');
        }),
      ).rejects.toThrow('business logic failed');
    });

    it('should release lock even when function throws', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.eval.mockResolvedValue(1);

      try {
        await service.withLock('test-key', () => {
          throw new Error('oops');
        });
      } catch {
        // expected
      }

      expect(mockRedis.eval).toHaveBeenCalledTimes(1);
    });
  });

  describe('isLocked', () => {
    it('should return true when lock exists', async () => {
      mockRedis.exists.mockResolvedValue(1);

      expect(await service.isLocked('test-key')).toBe(true);
    });

    it('should return false when lock does not exist', async () => {
      mockRedis.exists.mockResolvedValue(0);

      expect(await service.isLocked('test-key')).toBe(false);
    });
  });

  describe('extendLock', () => {
    it('should return true when lock is extended', async () => {
      mockRedis.pexpire.mockResolvedValue(1);

      expect(await service.extendLock('test-key', 60000)).toBe(true);
    });

    it('should return false when lock does not exist', async () => {
      mockRedis.pexpire.mockResolvedValue(0);

      expect(await service.extendLock('test-key', 60000)).toBe(false);
    });
  });
});
