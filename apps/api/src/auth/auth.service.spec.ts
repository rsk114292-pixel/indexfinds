import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import {
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthService } from './auth.service';
import { User, UserRole } from '../users/entities/user.entity';
import { ReferralService } from '../referral/referral.service';
import { TokenService } from './token.service';
import { LoginLogService } from './login-log.service';
import { AccountLockService } from './account-lock.service';
import { EmailService } from '../email/email.service';
import { LoginProvider } from './entities/login-log.entity';

// Mock bcrypt module
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

import * as bcrypt from 'bcrypt';

const mockBcryptHash = bcrypt.hash as jest.Mock;
const mockBcryptCompare = bcrypt.compare as jest.Mock;

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let tokenService: any;
  let accountLockService: any;
  let loginLogService: any;
  let emailService: any;
  let eventEmitter: any;
  let referralService: any;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    mockBcryptHash.mockResolvedValue('hashed-password');
    mockBcryptCompare.mockResolvedValue(true);

    userRepository = {
      findOne: jest.fn(),
      create: jest.fn((data) => ({ id: 'user-1', ...data })),
      save: jest.fn((user) => Promise.resolve(user)),
    };

    tokenService = {
      generateOAuthCode: jest.fn(),
      exchangeOAuthCode: jest.fn(),
      generateTokenPair: jest.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }),
      revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
      revokeAllUserTokens: jest.fn().mockResolvedValue(undefined),
      blacklistAccessToken: jest.fn().mockResolvedValue(undefined),
      refreshTokens: jest.fn().mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: { id: 'user-1', email: 'test@test.com' },
      }),
    };

    accountLockService = {
      checkLocked: jest.fn().mockResolvedValue(undefined),
      recordFailure: jest.fn().mockResolvedValue(1),
      clearAttempts: jest.fn().mockResolvedValue(undefined),
      getMaxAttempts: jest.fn().mockReturnValue(5),
    };

    loginLogService = {
      logSuccess: jest.fn(),
      logFailure: jest.fn(),
      logOAuth: jest.fn(),
      logLogout: jest.fn(),
    };

    emailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(true),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    referralService = {
      triggerAttributionFromCookie: jest.fn().mockResolvedValue(undefined),
      attachAnonymousAttributionsToUserFromCookie: jest.fn().mockResolvedValue({
        attachedCount: 0,
        highIntentActionCount: 0,
      }),
      hasRegistrationAttribution: jest.fn().mockResolvedValue(false),
      checkAndFinalizeConversion: jest.fn().mockResolvedValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('test-token') },
        },
        {
          provide: ReferralService,
          useValue: referralService,
        },
        {
          provide: TokenService,
          useValue: tokenService,
        },
        {
          provide: LoginLogService,
          useValue: loginLogService,
        },
        {
          provide: AccountLockService,
          useValue: accountLockService,
        },
        {
          provide: EmailService,
          useValue: emailService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => defaultValue),
          },
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: {
            set: jest.fn().mockResolvedValue('OK'),
            setex: jest.fn().mockResolvedValue('OK'),
            get: jest.fn().mockResolvedValue(null),
            del: jest.fn().mockResolvedValue(1),
          },
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@test.com',
      password: 'Test123!@#',
      username: 'New User',
    };

    it('UT-AUTH-001: should register new user successfully', async () => {
      userRepository.findOne.mockResolvedValue(null); // No existing user

      const result = await service.register(
        registerDto,
        undefined,
        '127.0.0.1',
        'Chrome/120',
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(userRepository.create).toHaveBeenCalledWith({
        email: registerDto.email,
        password: 'hashed-password',
        username: registerDto.username,
      });
      expect(userRepository.save).toHaveBeenCalled();
      expect(tokenService.generateTokenPair).toHaveBeenCalled();
      expect(loginLogService.logSuccess).toHaveBeenCalledWith(
        'user-1',
        '127.0.0.1',
        'Chrome/120',
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'points.earn.request',
        expect.objectContaining({
          userId: 'user-1',
          action: 'registration',
          referenceType: 'user',
          referenceId: 'user-1',
        }),
      );
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: expect.objectContaining({
          id: 'user-1',
          email: registerDto.email,
        }),
      });
    });

    it('UT-AUTH-002: should throw ConflictException for duplicate email', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'existing-user',
        email: registerDto.email,
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Email already exists',
      );
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('UT-AUTH-003: should reject disposable email addresses', async () => {
      const disposableDto = {
        email: 'test@guerrillamail.com',
        password: 'Test123!@#',
        username: 'Test User',
      };

      await expect(service.register(disposableDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.register(disposableDto)).rejects.toThrow(
        'Disposable email addresses are not allowed',
      );
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should process referral attribution when referral cookie provided', async () => {
      userRepository.findOne.mockResolvedValue(null);
      const referralService = {
        triggerAttributionFromCookie: jest.fn().mockResolvedValue(undefined),
        attachAnonymousAttributionsToUserFromCookie: jest
          .fn()
          .mockResolvedValue({
            attachedCount: 0,
            highIntentActionCount: 0,
          }),
        hasRegistrationAttribution: jest.fn().mockResolvedValue(false),
      };
      const module = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: getRepositoryToken(User), useValue: userRepository },
          { provide: JwtService, useValue: { sign: jest.fn() } },
          { provide: ReferralService, useValue: referralService },
          { provide: TokenService, useValue: tokenService },
          { provide: LoginLogService, useValue: loginLogService },
          { provide: AccountLockService, useValue: accountLockService },
          { provide: EmailService, useValue: emailService },
          {
            provide: ConfigService,
            useValue: { get: jest.fn((_k: string, d?: string) => d) },
          },
          {
            provide: 'REDIS_CLIENT',
            useValue: { setex: jest.fn(), get: jest.fn(), del: jest.fn() },
          },
          {
            provide: EventEmitter2,
            useValue: eventEmitter,
          },
        ],
      }).compile();
      const testService = module.get<AuthService>(AuthService);

      await testService.register(registerDto, 'referral-cookie-123');

      expect(referralService.triggerAttributionFromCookie).toHaveBeenCalled();
      expect(
        referralService.attachAnonymousAttributionsToUserFromCookie,
      ).toHaveBeenCalledWith('referral-cookie-123', 'user-1');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'points.earn.request',
        expect.objectContaining({
          action: 'registration',
          referenceId: 'user-1',
        }),
      );
    });

    it('should award the first intent-action bonus when anonymous purchase data is rebound on registration', async () => {
      userRepository.findOne.mockResolvedValue(null);
      const referralService = {
        triggerAttributionFromCookie: jest.fn().mockResolvedValue(undefined),
        attachAnonymousAttributionsToUserFromCookie: jest
          .fn()
          .mockResolvedValue({
            attachedCount: 2,
            highIntentActionCount: 1,
          }),
        hasRegistrationAttribution: jest.fn().mockResolvedValue(false),
      };
      const module = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: getRepositoryToken(User), useValue: userRepository },
          { provide: JwtService, useValue: { sign: jest.fn() } },
          { provide: ReferralService, useValue: referralService },
          { provide: TokenService, useValue: tokenService },
          { provide: LoginLogService, useValue: loginLogService },
          { provide: AccountLockService, useValue: accountLockService },
          { provide: EmailService, useValue: emailService },
          {
            provide: ConfigService,
            useValue: { get: jest.fn((_k: string, d?: string) => d) },
          },
          {
            provide: 'REDIS_CLIENT',
            useValue: { setex: jest.fn(), get: jest.fn(), del: jest.fn() },
          },
          {
            provide: EventEmitter2,
            useValue: eventEmitter,
          },
        ],
      }).compile();
      const testService = module.get<AuthService>(AuthService);

      await testService.register(registerDto, 'referral-cookie-123');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'points.earn.request',
        expect.objectContaining({
          userId: 'user-1',
          action: 'first_favorite',
          referenceType: 'user',
          referenceId: 'user-1',
          metadata: expect.objectContaining({
            source: 'anonymous_referral_rebind',
          }),
        }),
      );
    });
  });

  describe('handleOAuthLogin', () => {
    it('should process referral attribution and points for new verified OAuth users', async () => {
      const oauthUser = {
        id: 'user-1',
        email: 'oauth@test.com',
        emailVerified: true,
      } as User & { __oauthContext?: { isNewUser: boolean } };
      Object.defineProperty(oauthUser, '__oauthContext', {
        value: { isNewUser: true },
        enumerable: false,
      });
      tokenService.generateOAuthCode.mockResolvedValue('oauth-code-1');
      referralService.attachAnonymousAttributionsToUserFromCookie.mockResolvedValue(
        {
          attachedCount: 2,
          highIntentActionCount: 1,
        },
      );

      const result = await service.handleOAuthLogin(
        oauthUser,
        LoginProvider.GOOGLE,
        '127.0.0.1',
        'Chrome/120',
        'ref_click_id=click-1&referral_code=ABC123&exp=9999999999999',
      );

      expect(referralService.triggerAttributionFromCookie).toHaveBeenCalledWith(
        'ref_click_id=click-1&referral_code=ABC123&exp=9999999999999',
        'registration',
        'user-1',
        { email: 'oauth@test.com' },
      );
      expect(
        referralService.attachAnonymousAttributionsToUserFromCookie,
      ).toHaveBeenCalledWith(
        'ref_click_id=click-1&referral_code=ABC123&exp=9999999999999',
        'user-1',
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'points.earn.request',
        expect.objectContaining({ action: 'registration' }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'points.earn.request',
        expect.objectContaining({ action: 'referred_email_verification' }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'points.earn.request',
        expect.objectContaining({ action: 'first_favorite' }),
      );
      expect(referralService.checkAndFinalizeConversion).toHaveBeenCalledWith(
        'user-1',
      );
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
      expect(loginLogService.logOAuth).toHaveBeenCalledWith(
        'user-1',
        LoginProvider.GOOGLE,
        '127.0.0.1',
        'Chrome/120',
      );
      expect(result).toEqual({
        redirectUrl: 'http://localhost:3101/auth/callback?code=oauth-code-1',
      });
    });

    it('should send a verification email for new OAuth users whose provider email is not verified', async () => {
      const oauthUser = {
        id: 'user-2',
        email: 'oauth-unverified@test.com',
        emailVerified: false,
      } as User & { __oauthContext?: { isNewUser: boolean } };
      Object.defineProperty(oauthUser, '__oauthContext', {
        value: { isNewUser: true },
        enumerable: false,
      });
      tokenService.generateOAuthCode.mockResolvedValue('oauth-code-2');
      userRepository.findOne.mockResolvedValue(oauthUser);

      await service.handleOAuthLogin(
        oauthUser,
        LoginProvider.DISCORD,
        '127.0.0.1',
        'Discord/1.0',
      );
      await new Promise((resolve) => setImmediate(resolve));

      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        'oauth-unverified@test.com',
        expect.any(String),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'points.earn.request',
        expect.objectContaining({ action: 'registration' }),
      );
      expect(
        referralService.triggerAttributionFromCookie,
      ).not.toHaveBeenCalled();
      expect(referralService.checkAndFinalizeConversion).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@test.com',
      password: 'Test123!@#',
    };

    const mockUser = {
      id: 'user-1',
      email: 'test@test.com',
      password: 'hashed-password',
      username: 'Test User',
      role: UserRole.USER,
      isActive: true,
      lastLoginAt: null,
    };

    it('UT-AUTH-004: should login successfully with correct credentials', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue({
        ...mockUser,
        lastLoginAt: new Date(),
      });

      const result = await service.login(loginDto, '127.0.0.1', 'Chrome/120');

      expect(accountLockService.checkLocked).toHaveBeenCalledWith(mockUser);
      expect(accountLockService.clearAttempts).toHaveBeenCalledWith(
        loginDto.email,
        mockUser,
      );
      expect(loginLogService.logSuccess).toHaveBeenCalledWith(
        'user-1',
        '127.0.0.1',
        'Chrome/120',
      );
      expect(tokenService.generateTokenPair).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-1' }),
        '127.0.0.1',
        'Chrome/120',
      );
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: expect.objectContaining({
          id: 'user-1',
          email: 'test@test.com',
        }),
      });
    });

    it('UT-AUTH-006: should throw UnauthorizedException for non-existent user', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto, '127.0.0.1')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto, '127.0.0.1')).rejects.toThrow(
        /Invalid email or password/,
      );
      expect(loginLogService.logFailure).toHaveBeenCalledWith(
        loginDto.email,
        '127.0.0.1',
        undefined,
      );
      expect(tokenService.generateTokenPair).not.toHaveBeenCalled();
    });

    it('UT-AUTH-005: should throw UnauthorizedException for incorrect password', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      mockBcryptCompare.mockResolvedValueOnce(false);
      accountLockService.recordFailure.mockResolvedValue(3); // 3 attempts

      await expect(service.login(loginDto, '127.0.0.1')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(accountLockService.recordFailure).toHaveBeenCalledWith(
        loginDto.email,
        mockUser,
      );
      expect(loginLogService.logFailure).toHaveBeenCalledWith(
        loginDto.email,
        '127.0.0.1',
        undefined,
        'user-1',
      );
      expect(tokenService.generateTokenPair).not.toHaveBeenCalled();
    });

    it('UT-AUTH-007: should throw ForbiddenException when account is locked', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      accountLockService.checkLocked.mockRejectedValue(
        new ForbiddenException('账号已锁定，请30分钟后重试'),
      );

      await expect(service.login(loginDto, '127.0.0.1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(accountLockService.checkLocked).toHaveBeenCalledWith(mockUser);
      expect(tokenService.generateTokenPair).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for OAuth user without password', async () => {
      const oauthUser = { ...mockUser, password: null };
      userRepository.findOne.mockResolvedValue(oauthUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(/social login/);
    });

    it('should show remaining attempts on failed login', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      mockBcryptCompare.mockResolvedValueOnce(false);
      accountLockService.recordFailure.mockResolvedValue(2); // 2nd attempt

      try {
        await service.login(loginDto);
      } catch (error) {
        expect(error.response.message).toContain('3 attempt(s) remaining');
        expect(error.response.remainingAttempts).toBe(3);
      }
    });

    it('should lock account after 5 failed attempts', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      mockBcryptCompare.mockResolvedValueOnce(false);
      accountLockService.recordFailure.mockResolvedValue(5); // 5th attempt

      try {
        await service.login(loginDto);
      } catch (error) {
        expect(error.response.message).toContain(
          'Too many failed login attempts',
        );
      }
    });
  });

  describe('changePassword', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@test.com',
      password: 'old-hashed-password',
      username: 'Test User',
    };

    it('UT-AUTH-008: should change password successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      await service.changePassword('user-1', {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123!',
      });

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'hashed-password',
          passwordChangedAt: expect.any(Date),
        }),
      );
      expect(tokenService.revokeAllUserTokens).toHaveBeenCalledWith('user-1');
    });

    it('UT-AUTH-009: should throw UnauthorizedException for incorrect current password', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      mockBcryptCompare.mockResolvedValue(false);

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'wrongPassword',
          newPassword: 'newPassword123!',
        }),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'wrongPassword',
          newPassword: 'newPassword123!',
        }),
      ).rejects.toThrow('Current password is incorrect');

      expect(userRepository.save).not.toHaveBeenCalled();
      expect(tokenService.revokeAllUserTokens).not.toHaveBeenCalled();
    });

    it('should require current password for users with existing password', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.changePassword('user-1', {
          currentPassword: undefined,
          newPassword: 'newPassword123!',
        }),
      ).rejects.toThrow('Current password is required');
    });

    it('should allow setting password for OAuth users without current password', async () => {
      const oauthUser = { ...mockUser, password: null };
      userRepository.findOne.mockResolvedValue(oauthUser);

      await service.changePassword('user-1', {
        currentPassword: undefined,
        newPassword: 'newPassword123!',
      });

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'hashed-password',
        }),
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.changePassword('nonexistent', {
          currentPassword: 'old',
          newPassword: 'new',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('should return user if active user found', async () => {
      const mockUser = { id: 'user-1', email: 'test@test.com', isActive: true };
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser('user-1');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1', isActive: true },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.validateUser('nonexistent')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should revoke refresh token and blacklist access token', async () => {
      await service.logout(
        'refresh-token-123',
        'jti-456',
        'user-1',
        '127.0.0.1',
      );

      expect(tokenService.revokeRefreshToken).toHaveBeenCalledWith(
        'refresh-token-123',
      );
      expect(tokenService.blacklistAccessToken).toHaveBeenCalledWith('jti-456');
      expect(loginLogService.logLogout).toHaveBeenCalledWith(
        'user-1',
        '127.0.0.1',
        undefined,
      );
    });

    it('should handle missing optional parameters', async () => {
      await service.logout('', undefined, undefined);

      // Empty string should still call revoke
      expect(loginLogService.logLogout).not.toHaveBeenCalled();
    });
  });

  describe('logoutAll', () => {
    it('should revoke all user tokens and blacklist current token', async () => {
      await service.logoutAll('user-1', 'current-jti');

      expect(tokenService.revokeAllUserTokens).toHaveBeenCalledWith('user-1');
      expect(tokenService.blacklistAccessToken).toHaveBeenCalledWith(
        'current-jti',
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('should return new access token and user info', async () => {
      const result = await service.refreshAccessToken('refresh-token-123');

      expect(tokenService.refreshTokens).toHaveBeenCalledWith(
        'refresh-token-123',
        undefined,
        undefined,
      );
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: expect.objectContaining({
          id: 'user-1',
          email: 'test@test.com',
        }),
      });
    });
  });

  describe('forgotPassword', () => {
    let redisClient: any;

    beforeEach(() => {
      redisClient = {
        set: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue(null),
        del: jest.fn().mockResolvedValue(1),
      };
      // Get redis client from the module
      const module = service['redis'];
      Object.assign(module, redisClient);
    });

    it('should send password reset email for existing user', async () => {
      const mockUser = { id: 'user-1', email: 'test@test.com' };
      userRepository.findOne.mockResolvedValue(mockUser);

      await service.forgotPassword('test@test.com');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@test.com' },
      });
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@test.com',
        expect.any(String),
      );
    });

    it('should not reveal if user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await service.forgotPassword('nonexistent@test.com');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'nonexistent@test.com' },
      });
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should handle email service failure gracefully', async () => {
      const mockUser = { id: 'user-1', email: 'test@test.com' };
      userRepository.findOne.mockResolvedValue(mockUser);
      emailService.sendPasswordResetEmail.mockRejectedValue(
        new Error('Email service down'),
      );

      await expect(
        service.forgotPassword('test@test.com'),
      ).resolves.not.toThrow();
    });
  });

  describe('resetPassword', () => {
    let redisClient: any;

    beforeEach(() => {
      redisClient = {
        set: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue('user-1'),
        del: jest.fn().mockResolvedValue(1),
      };
      const module = service['redis'];
      Object.assign(module, redisClient);
    });

    it('should reset password with valid token', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@test.com',
        password: 'old-hash',
      };
      userRepository.findOne.mockResolvedValue(mockUser);
      redisClient.get.mockResolvedValue('user-1');

      await service.resetPassword('valid-token', 'NewPassword123!');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'hashed-password',
          passwordChangedAt: expect.any(Date),
        }),
      );
      expect(tokenService.revokeAllUserTokens).toHaveBeenCalledWith('user-1');
    });

    it('should throw BadRequestException for invalid token', async () => {
      redisClient.get.mockResolvedValue(null);

      await expect(
        service.resetPassword('invalid-token', 'NewPassword123!'),
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should throw BadRequestException if user not found', async () => {
      redisClient.get.mockResolvedValue('user-1');
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword('valid-token', 'NewPassword123!'),
      ).rejects.toThrow('User not found');
    });

    it('should delete token after successful reset (one-time use)', async () => {
      const mockUser = { id: 'user-1', email: 'test@test.com' };
      userRepository.findOne.mockResolvedValue(mockUser);
      redisClient.get.mockResolvedValue('user-1');

      await service.resetPassword('valid-token', 'NewPassword123!');

      expect(redisClient.del).toHaveBeenCalledWith(
        'verify:password:valid-token',
      );
    });
  });

  describe('sendVerificationEmail', () => {
    let redisClient: any;

    beforeEach(() => {
      redisClient = {
        set: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue(null),
        del: jest.fn().mockResolvedValue(1),
      };
      const module = service['redis'];
      Object.assign(module, redisClient);
    });

    it('should send verification email for unverified user', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@test.com',
        emailVerified: false,
      };
      userRepository.findOne.mockResolvedValue(mockUser);

      await service.sendVerificationEmail('user-1');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        'test@test.com',
        expect.any(String),
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.sendVerificationEmail('nonexistent'),
      ).rejects.toThrow('User not found');
    });

    it('should throw BadRequestException if email already verified', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@test.com',
        emailVerified: true,
      };
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.sendVerificationEmail('user-1')).rejects.toThrow(
        'Email already verified',
      );
    });
  });

  describe('verifyEmail', () => {
    let redisClient: any;

    beforeEach(() => {
      redisClient = {
        set: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue('user-1'),
        del: jest.fn().mockResolvedValue(1),
      };
      const module = service['redis'];
      Object.assign(module, redisClient);
    });

    it('should verify email with valid token', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@test.com',
        emailVerified: false,
      };
      userRepository.findOne.mockResolvedValue(mockUser);
      redisClient.get.mockResolvedValue('user-1');

      await service.verifyEmail('valid-token');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          emailVerified: true,
          emailVerifiedAt: expect.any(Date),
        }),
      );
    });

    it('should award referral email verification bonus for referred users', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@test.com',
        emailVerified: false,
      };
      userRepository.findOne.mockResolvedValue(mockUser);
      redisClient.get.mockResolvedValue('user-1');
      const referralService = service['referralService'];
      referralService.hasRegistrationAttribution.mockResolvedValue(true);

      await service.verifyEmail('valid-token');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'points.earn.request',
        expect.objectContaining({
          userId: 'user-1',
          action: 'referred_email_verification',
          referenceType: 'user',
          referenceId: 'user-1',
        }),
      );
    });

    it('should throw BadRequestException for invalid token', async () => {
      redisClient.get.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        'Invalid or expired verification token',
      );
    });

    it('should throw BadRequestException if user not found', async () => {
      redisClient.get.mockResolvedValue('user-1');
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.verifyEmail('valid-token')).rejects.toThrow(
        'User not found',
      );
    });

    it('should delete token after successful verification (one-time use)', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@test.com',
        emailVerified: false,
      };
      userRepository.findOne.mockResolvedValue(mockUser);
      redisClient.get.mockResolvedValue('user-1');

      await service.verifyEmail('valid-token');

      expect(redisClient.del).toHaveBeenCalledWith('verify:email:valid-token');
    });
  });
});
