import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { TokenService } from './token.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { User, UserRole } from '../users/entities/user.entity';

describe('TokenService', () => {
  let module: TestingModule;
  let service: TokenService;
  let jwtService: { sign: jest.Mock };
  let refreshTokenRepository: Record<string, jest.Mock>;
  let redis: Record<string, jest.Mock>;

  const mockUser: Partial<User> = {
    id: 'user-1',
    email: 'test@test.com',
    role: UserRole.USER,
    isActive: true,
  };

  beforeEach(async () => {
    jwtService = {
      sign: jest.fn().mockReturnValue('signed-jwt-token'),
    };

    refreshTokenRepository = {
      create: jest.fn((data) => ({ id: 'rt-1', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 3 }),
      find: jest.fn().mockResolvedValue([]),
    };

    redis = {
      setex: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      getdel: jest.fn().mockResolvedValue(null),
    };

    module = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                JWT_ACCESS_EXPIRATION: '15m',
                JWT_REFRESH_EXPIRATION_DAYS: '30',
              };
              return config[key];
            }),
          },
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: refreshTokenRepository,
        },
        { provide: 'REDIS_CLIENT', useValue: redis },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateAccessToken', () => {
    it('should return a signed JWT with sub, email, role, jti', () => {
      const token = service.generateAccessToken(mockUser as User);

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-1',
          email: 'test@test.com',
          role: UserRole.USER,
          jti: expect.any(String),
        }),
        expect.objectContaining({ expiresIn: '15m' }),
      );
      expect(token).toBe('signed-jwt-token');
    });

    it('should generate unique jti for each call', () => {
      service.generateAccessToken(mockUser as User);
      service.generateAccessToken(mockUser as User);

      const firstJti = jwtService.sign.mock.calls[0][0].jti;
      const secondJti = jwtService.sign.mock.calls[1][0].jti;
      expect(firstJti).not.toBe(secondJti);
    });
  });

  describe('generateRefreshToken', () => {
    it('should create a DB record with hashed token', async () => {
      const token = await service.generateRefreshToken(mockUser as User);

      expect(refreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      );
      expect(refreshTokenRepository.save).toHaveBeenCalled();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes hex = 64 chars
    });

    it('should store ipAddress and deviceInfo', async () => {
      await service.generateRefreshToken(
        mockUser as User,
        '192.168.1.1',
        'Chrome/120',
      );

      expect(refreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '192.168.1.1',
          deviceInfo: 'Chrome/120',
        }),
      );
    });
  });

  describe('generateTokenPair', () => {
    it('should return both accessToken and refreshToken', async () => {
      const result = await service.generateTokenPair(mockUser as User);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.accessToken).toBe('signed-jwt-token');
    });
  });

  describe('refreshTokens', () => {
    const validStoredToken = {
      id: 'rt-1',
      tokenHash: 'hash',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 86400000), // tomorrow
      user: { ...mockUser, isActive: true },
    };

    it('should return new accessToken and refreshToken for valid refresh token', async () => {
      refreshTokenRepository.findOne.mockResolvedValue({ ...validStoredToken });

      const result = await service.refreshTokens('valid-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      // 轮换：旧 token 应被标记为已撤销
      expect(refreshTokenRepository.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid token hash', async () => {
      refreshTokenRepository.findOne.mockResolvedValue(null);

      await expect(service.refreshTokens('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for revoked token', async () => {
      refreshTokenRepository.findOne.mockResolvedValue({
        ...validStoredToken,
        revokedAt: new Date(),
      });

      await expect(service.refreshTokens('revoked-token')).rejects.toThrow(
        'Refresh token has been revoked',
      );
    });

    it('should revoke all user tokens when revoked refresh token reused after grace period', async () => {
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(100000);
      refreshTokenRepository.update.mockClear();

      refreshTokenRepository.findOne.mockResolvedValue({
        ...validStoredToken,
        userId: 'user-1',
        tokenHash: 'hash',
        revokedAt: new Date(80_000),
      });

      await expect(service.refreshTokens('revoked-token')).rejects.toThrow(
        'Refresh token has been revoked',
      );

      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { userId: 'user-1', revokedAt: IsNull() },
        { revokedAt: expect.any(Date) },
      );

      nowSpy.mockRestore();
    });

    it('should throttle revoke-all when repeated revoked token is reused', async () => {
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(100000);
      refreshTokenRepository.update.mockClear();

      refreshTokenRepository.findOne.mockResolvedValue({
        ...validStoredToken,
        userId: 'user-1',
        tokenHash: 'hash',
        revokedAt: new Date(80_000),
      });

      await expect(service.refreshTokens('revoked-token')).rejects.toThrow(
        'Refresh token has been revoked',
      );
      await expect(service.refreshTokens('revoked-token')).rejects.toThrow(
        'Refresh token has been revoked',
      );

      expect(refreshTokenRepository.update).toHaveBeenCalledTimes(1);

      nowSpy.mockRestore();
    });

    it('should throw UnauthorizedException for expired token', async () => {
      refreshTokenRepository.findOne.mockResolvedValue({
        ...validStoredToken,
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000), // past
      });

      await expect(service.refreshTokens('expired-token')).rejects.toThrow(
        'Refresh token has expired',
      );
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      refreshTokenRepository.findOne.mockResolvedValue({
        ...validStoredToken,
        revokedAt: null,
        user: { ...mockUser, isActive: false },
      });

      await expect(service.refreshTokens('token')).rejects.toThrow(
        'User not found or inactive',
      );
    });
  });

  describe('revokeRefreshToken', () => {
    it('should set revokedAt on the token record', async () => {
      await service.revokeRefreshToken('token-to-revoke');

      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { tokenHash: expect.any(String) },
        { revokedAt: expect.any(Date) },
      );
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all non-revoked tokens for user', async () => {
      const count = await service.revokeAllUserTokens('user-1');

      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { userId: 'user-1', revokedAt: IsNull() },
        { revokedAt: expect.any(Date) },
      );
      expect(count).toBe(1);
    });
  });

  describe('blacklistAccessToken', () => {
    it('should set Redis key with TTL derived from access token expiration + 10min margin', async () => {
      await service.blacklistAccessToken('jti-123');

      // JWT_ACCESS_EXPIRATION = '15m' → 15*60 + 10*60 = 1500 seconds
      expect(redis.setex).toHaveBeenCalledWith(
        'token:blacklist:jti-123',
        1500,
        '1',
      );
    });
  });

  describe('isAccessTokenBlacklisted', () => {
    it('should return true for blacklisted jti', async () => {
      redis.get.mockResolvedValue('1');

      const result = await service.isAccessTokenBlacklisted('jti-123');

      expect(result).toBe(true);
    });

    it('should return false for non-blacklisted jti', async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.isAccessTokenBlacklisted('jti-456');

      expect(result).toBe(false);
    });

    it('should return false (fail-open) when Redis unavailable', async () => {
      redis.get.mockRejectedValue(new Error('Redis down'));

      const result = await service.isAccessTokenBlacklisted('jti-789');

      // fail-open：Redis 不可用时放行请求，token 本身仍具有密码学有效性
      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired tokens and return count', async () => {
      refreshTokenRepository.delete.mockResolvedValue({ affected: 5 });

      const result = await service.cleanupExpiredTokens();

      expect(result).toBe(5);
    });
  });

  describe('getUserSessions', () => {
    it('should return non-revoked, non-expired tokens ordered by createdAt DESC', async () => {
      const sessions = [{ id: 'rt-1' }, { id: 'rt-2' }];
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(sessions),
      };
      refreshTokenRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);

      const result = await service.getUserSessions('user-1');

      expect(refreshTokenRepository.createQueryBuilder).toHaveBeenCalledWith(
        'rt',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'rt.user_id = :userId',
        { userId: 'user-1' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'rt.revoked_at IS NULL',
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'rt.created_at',
        'DESC',
      );
      expect(result).toEqual(sessions);
    });
  });

  describe('revokeSession', () => {
    it('should revoke session matching userId and sessionId', async () => {
      refreshTokenRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.revokeSession('user-1', 'session-1');

      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { id: 'session-1', userId: 'user-1' },
        { revokedAt: expect.any(Date) },
      );
      expect(result).toBe(true);
    });

    it('should return false if session not found', async () => {
      refreshTokenRepository.update.mockResolvedValue({ affected: 0 });

      const result = await service.revokeSession('user-1', 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('generateOAuthCode', () => {
    it('should store tokens in Redis with 5min TTL', async () => {
      const code = await service.generateOAuthCode(
        'user-1',
        'access-tok',
        'refresh-tok',
      );

      expect(redis.setex).toHaveBeenCalledWith(
        `oauth:code:${code}`,
        300,
        JSON.stringify({
          userId: 'user-1',
          accessToken: 'access-tok',
          refreshToken: 'refresh-tok',
        }),
      );
      expect(code.length).toBe(64); // 32 bytes hex
    });
  });

  describe('exchangeOAuthCode', () => {
    it('should return token data and delete Redis key (one-time use)', async () => {
      const data = {
        userId: 'user-1',
        accessToken: 'at',
        refreshToken: 'rt',
      };
      redis.getdel.mockResolvedValue(JSON.stringify(data));

      const result = await service.exchangeOAuthCode('code-123');

      expect(redis.getdel).toHaveBeenCalledWith('oauth:code:code-123');
      expect(result).toEqual(data);
    });

    it('should return null for invalid/expired code', async () => {
      redis.getdel.mockResolvedValue(null);

      const result = await service.exchangeOAuthCode('expired-code');

      expect(result).toBeNull();
    });
  });
});
