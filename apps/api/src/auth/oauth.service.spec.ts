import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { OAuthService, OAuthProfile } from './oauth.service';
import { User } from '../users/entities/user.entity';
import {
  UserOAuthAccount,
  OAuthProvider,
} from './entities/user-oauth-account.entity';

describe('OAuthService', () => {
  const originalRegistrationFlag = process.env.PUBLIC_REGISTRATION_ENABLED;
  let service: OAuthService;
  let userRepository: any;
  let oauthAccountRepository: any;

  const mockGoogleProfile: OAuthProfile = {
    provider: OAuthProvider.GOOGLE,
    providerAccountId: 'google-123',
    email: 'test@gmail.com',
    emailVerified: true,
    name: 'Test User',
    avatar: 'https://example.com/avatar.jpg',
    accessToken: 'google-access-token',
    refreshToken: 'google-refresh-token',
    expiresAt: new Date(Date.now() + 3600000),
  };

  const mockDiscordProfile: OAuthProfile = {
    provider: OAuthProvider.DISCORD,
    providerAccountId: 'discord-456',
    email: 'test@discord.com',
    emailVerified: true,
    name: 'Discord User',
    avatar: 'https://cdn.discordapp.com/avatar.jpg',
    accessToken: 'discord-access-token',
  };

  beforeEach(async () => {
    process.env.PUBLIC_REGISTRATION_ENABLED = 'true';
    userRepository = {
      findOne: jest.fn(),
      create: jest.fn((data) => ({ id: 'user-1', ...data })),
      save: jest.fn((user) => Promise.resolve(user)),
    };

    oauthAccountRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((data) => ({ id: 'oauth-1', ...data })),
      save: jest.fn((account) => Promise.resolve(account)),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(UserOAuthAccount),
          useValue: oauthAccountRepository,
        },
      ],
    }).compile();

    service = module.get<OAuthService>(OAuthService);
  });

  afterAll(() => {
    if (originalRegistrationFlag === undefined) {
      delete process.env.PUBLIC_REGISTRATION_ENABLED;
    } else {
      process.env.PUBLIC_REGISTRATION_ENABLED = originalRegistrationFlag;
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOrCreateUserByOAuth', () => {
    describe('UT-OAUTH-001: OAuth 新用户注册', () => {
      it('rejects a new OAuth user when public registration is disabled', async () => {
        process.env.PUBLIC_REGISTRATION_ENABLED = 'false';
        oauthAccountRepository.findOne.mockResolvedValue(null);
        userRepository.findOne.mockResolvedValue(null);

        await expect(
          service.findOrCreateUserByOAuth(mockGoogleProfile),
        ).rejects.toThrow(ForbiddenException);
        expect(userRepository.create).not.toHaveBeenCalled();
      });

      it('should create new user and OAuth account for new Google user', async () => {
        oauthAccountRepository.findOne.mockResolvedValue(null); // No existing OAuth
        userRepository.findOne.mockResolvedValue(null); // No existing user

        const result = await service.findOrCreateUserByOAuth(mockGoogleProfile);

        expect(userRepository.create).toHaveBeenCalledWith({
          email: 'test@gmail.com',
          username: 'Test User',
          avatar: 'https://example.com/avatar.jpg',
          emailVerified: true,
          emailVerifiedAt: expect.any(Date),
        });
        expect(userRepository.save).toHaveBeenCalled();
        expect(oauthAccountRepository.create).toHaveBeenCalledWith({
          userId: 'user-1',
          provider: OAuthProvider.GOOGLE,
          providerAccountId: 'google-123',
          email: 'test@gmail.com',
          name: 'Test User',
          avatar: 'https://example.com/avatar.jpg',
          accessToken: 'google-access-token',
          refreshToken: 'google-refresh-token',
          expiresAt: expect.any(Date),
        });
        expect(oauthAccountRepository.save).toHaveBeenCalled();
        expect(result).toEqual(expect.objectContaining({ id: 'user-1' }));
      });

      it('should create new user with generated email if OAuth has no email', async () => {
        const profileWithoutEmail: OAuthProfile = {
          ...mockGoogleProfile,
          email: undefined,
        };
        oauthAccountRepository.findOne.mockResolvedValue(null);
        userRepository.findOne.mockResolvedValue(null);

        await service.findOrCreateUserByOAuth(profileWithoutEmail);

        expect(userRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'google_google-123@oauth.local',
            emailVerified: true,
          }),
        );
      });

      it('should NOT auto-link when OAuth email is not verified (prevent account takeover)', async () => {
        const unverifiedProfile: OAuthProfile = {
          ...mockDiscordProfile,
          email: 'victim@example.com',
          emailVerified: false,
        };
        oauthAccountRepository.findOne.mockResolvedValue(null);

        await service.findOrCreateUserByOAuth(unverifiedProfile);

        // Key assertion: should never query for existing user by email
        expect(userRepository.findOne).not.toHaveBeenCalled();
        // Should create a new user instead
        expect(userRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'victim@example.com',
            emailVerified: false,
          }),
        );
      });

      it('should NOT auto-link when emailVerified is undefined', async () => {
        const noVerifiedFieldProfile: OAuthProfile = {
          ...mockDiscordProfile,
          email: 'victim@example.com',
          emailVerified: undefined,
        };
        oauthAccountRepository.findOne.mockResolvedValue(null);

        await service.findOrCreateUserByOAuth(noVerifiedFieldProfile);

        expect(userRepository.findOne).not.toHaveBeenCalled();
        expect(userRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            emailVerified: false,
          }),
        );
      });

      it('should auto-link when OAuth email IS verified and user exists', async () => {
        const verifiedProfile: OAuthProfile = {
          ...mockDiscordProfile,
          email: 'existing@example.com',
          emailVerified: true,
        };
        const existingUser = {
          id: 'existing-user-1',
          email: 'existing@example.com',
          password: 'hashed-password',
        };
        oauthAccountRepository.findOne.mockResolvedValue(null);
        userRepository.findOne.mockResolvedValue(existingUser);

        const result = await service.findOrCreateUserByOAuth(verifiedProfile);

        // Should find by email and link, not create new user
        expect(userRepository.findOne).toHaveBeenCalledWith({
          where: { email: 'existing@example.com' },
        });
        expect(userRepository.create).not.toHaveBeenCalled();
        expect(result).toEqual(existingUser);
      });
    });

    describe('UT-OAUTH-002: OAuth 已有用户合并', () => {
      it('should bind OAuth account to existing user with same email', async () => {
        const existingUser = {
          id: 'existing-user-1',
          email: 'test@gmail.com',
          password: 'hashed-password',
        };
        oauthAccountRepository.findOne.mockResolvedValue(null); // No existing OAuth
        userRepository.findOne.mockResolvedValue(existingUser); // User exists with same email

        const result = await service.findOrCreateUserByOAuth(mockGoogleProfile);

        expect(userRepository.create).not.toHaveBeenCalled(); // Should not create new user
        expect(oauthAccountRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'existing-user-1',
            provider: OAuthProvider.GOOGLE,
          }),
        );
        expect(result).toEqual(existingUser);
      });
    });

    describe('UT-OAUTH-003: OAuth 已有社交账号', () => {
      it('should return existing user for returning OAuth user', async () => {
        const existingUser = { id: 'user-1', email: 'test@gmail.com' };
        const existingOAuth = {
          id: 'oauth-1',
          provider: OAuthProvider.GOOGLE,
          providerAccountId: 'google-123',
          userId: 'user-1',
          user: existingUser,
          accessToken: 'old-token',
          refreshToken: 'old-refresh',
        };
        oauthAccountRepository.findOne.mockResolvedValue(existingOAuth);

        const result = await service.findOrCreateUserByOAuth(mockGoogleProfile);

        expect(userRepository.create).not.toHaveBeenCalled();
        expect(oauthAccountRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            accessToken: 'google-access-token',
            refreshToken: 'google-refresh-token',
          }),
        );
        expect(result).toEqual(existingUser);
      });
    });

    describe('UT-OAUTH-004: OAuth 用户自动验证', () => {
      it('should automatically verify email for OAuth users', async () => {
        oauthAccountRepository.findOne.mockResolvedValue(null);
        userRepository.findOne.mockResolvedValue(null);

        await service.findOrCreateUserByOAuth(mockGoogleProfile);

        expect(userRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            emailVerified: true,
            emailVerifiedAt: expect.any(Date),
          }),
        );
      });
    });

    it('should work with Discord OAuth', async () => {
      oauthAccountRepository.findOne.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findOrCreateUserByOAuth(mockDiscordProfile);

      expect(oauthAccountRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: OAuthProvider.DISCORD,
          providerAccountId: 'discord-456',
        }),
      );
      expect(result).toEqual(expect.objectContaining({ id: 'user-1' }));
    });
  });

  describe('linkOAuthAccount', () => {
    describe('UT-OAUTH-005: 绑定社交账号（成功）', () => {
      it('should link OAuth account to existing user', async () => {
        oauthAccountRepository.findOne.mockResolvedValue(null); // No existing OAuth

        await service.linkOAuthAccount('user-1', mockGoogleProfile);

        expect(oauthAccountRepository.create).toHaveBeenCalledWith({
          userId: 'user-1',
          provider: OAuthProvider.GOOGLE,
          providerAccountId: 'google-123',
          email: 'test@gmail.com',
          name: 'Test User',
          avatar: 'https://example.com/avatar.jpg',
          accessToken: 'google-access-token',
          refreshToken: 'google-refresh-token',
          expiresAt: expect.any(Date),
        });
        expect(oauthAccountRepository.save).toHaveBeenCalled();
      });
    });

    it('should update OAuth info if already linked to same user', async () => {
      const existingOAuth = {
        id: 'oauth-1',
        userId: 'user-1',
        provider: OAuthProvider.GOOGLE,
        providerAccountId: 'google-123',
        accessToken: 'old-token',
      };
      oauthAccountRepository.findOne.mockResolvedValue(existingOAuth);

      await service.linkOAuthAccount('user-1', mockGoogleProfile);

      expect(oauthAccountRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: 'google-access-token',
        }),
      );
    });

    it('should throw ConflictException if OAuth already linked to another user', async () => {
      const existingOAuth = {
        userId: 'other-user',
        provider: OAuthProvider.GOOGLE,
        providerAccountId: 'google-123',
      };
      oauthAccountRepository.findOne.mockResolvedValue(existingOAuth);

      await expect(
        service.linkOAuthAccount('user-1', mockGoogleProfile),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.linkOAuthAccount('user-1', mockGoogleProfile),
      ).rejects.toThrow('AUTH_OAUTH_ALREADY_LINKED');
    });

    it('should throw ConflictException if user already has same provider linked', async () => {
      // First call: check if OAuth account exists with this providerAccountId - return null
      // Second call: check if user already has this provider linked - return existing
      oauthAccountRepository.findOne
        .mockResolvedValueOnce(null) // First check: no OAuth with this providerAccountId
        .mockResolvedValueOnce({
          // Second check: user already has this provider
          userId: 'user-1',
          provider: OAuthProvider.GOOGLE,
          providerAccountId: 'google-different-id',
        });

      await expect(
        service.linkOAuthAccount('user-1', mockGoogleProfile),
      ).rejects.toThrow('AUTH_OAUTH_PROVIDER_DUPLICATE');
    });
  });

  describe('unlinkOAuthAccount', () => {
    describe('UT-OAUTH-006: 解绑唯一登录方式', () => {
      it('should prevent unlinking if it is the only login method', async () => {
        const userWithoutPassword = { id: 'user-1', password: null };
        const singleOAuthAccount = [
          { provider: OAuthProvider.GOOGLE, userId: 'user-1' },
        ];
        userRepository.findOne.mockResolvedValue(userWithoutPassword);
        oauthAccountRepository.find.mockResolvedValue(singleOAuthAccount);

        await expect(
          service.unlinkOAuthAccount('user-1', OAuthProvider.GOOGLE),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.unlinkOAuthAccount('user-1', OAuthProvider.GOOGLE),
        ).rejects.toThrow('AUTH_OAUTH_LAST_LOGIN_METHOD');
      });
    });

    it('should successfully unlink if user has password', async () => {
      const userWithPassword = { id: 'user-1', password: 'hashed-password' };
      const singleOAuthAccount = [
        { provider: OAuthProvider.GOOGLE, userId: 'user-1' },
      ];
      userRepository.findOne.mockResolvedValue(userWithPassword);
      oauthAccountRepository.find.mockResolvedValue(singleOAuthAccount);

      await service.unlinkOAuthAccount('user-1', OAuthProvider.GOOGLE);

      expect(oauthAccountRepository.delete).toHaveBeenCalledWith({
        userId: 'user-1',
        provider: OAuthProvider.GOOGLE,
      });
    });

    it('should successfully unlink if user has other OAuth accounts', async () => {
      const userWithoutPassword = { id: 'user-1', password: null };
      const multipleOAuthAccounts = [
        { provider: OAuthProvider.GOOGLE, userId: 'user-1' },
        { provider: OAuthProvider.DISCORD, userId: 'user-1' },
      ];
      userRepository.findOne.mockResolvedValue(userWithoutPassword);
      oauthAccountRepository.find.mockResolvedValue(multipleOAuthAccounts);

      await service.unlinkOAuthAccount('user-1', OAuthProvider.GOOGLE);

      expect(oauthAccountRepository.delete).toHaveBeenCalledWith({
        userId: 'user-1',
        provider: OAuthProvider.GOOGLE,
      });
    });

    it('should throw BadRequestException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.unlinkOAuthAccount('nonexistent', OAuthProvider.GOOGLE),
      ).rejects.toThrow('AUTH_USER_NOT_FOUND');
    });

    it('should throw BadRequestException if OAuth account not found', async () => {
      const user = { id: 'user-1', password: 'hashed' };
      userRepository.findOne.mockResolvedValue(user);
      oauthAccountRepository.find.mockResolvedValue([]);
      oauthAccountRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(
        service.unlinkOAuthAccount('user-1', OAuthProvider.GOOGLE),
      ).rejects.toThrow('AUTH_OAUTH_NOT_LINKED');
    });
  });

  describe('getLinkedAccounts', () => {
    it('should return list of linked OAuth accounts', async () => {
      const mockAccounts = [
        {
          provider: OAuthProvider.GOOGLE,
          email: 'test@gmail.com',
          name: 'Google User',
        },
        {
          provider: OAuthProvider.DISCORD,
          email: 'test@discord.com',
          name: 'Discord User',
        },
      ];
      oauthAccountRepository.find.mockResolvedValue(mockAccounts);

      const result = await service.getLinkedAccounts('user-1');

      expect(oauthAccountRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        select: ['provider', 'email', 'name'],
      });
      expect(result).toEqual([
        {
          provider: OAuthProvider.GOOGLE,
          email: 'test@gmail.com',
          name: 'Google User',
        },
        {
          provider: OAuthProvider.DISCORD,
          email: 'test@discord.com',
          name: 'Discord User',
        },
      ]);
    });

    it('should return empty array if no OAuth accounts linked', async () => {
      oauthAccountRepository.find.mockResolvedValue([]);

      const result = await service.getLinkedAccounts('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('updateOAuthAccount (private method)', () => {
    it('should update OAuth account tokens and profile info', async () => {
      const existingOAuth = {
        id: 'oauth-1',
        provider: OAuthProvider.GOOGLE,
        providerAccountId: 'google-123',
        userId: 'user-1',
        user: { id: 'user-1', email: 'test@gmail.com' },
        accessToken: 'old-token',
        refreshToken: 'old-refresh',
        name: 'Old Name',
      };
      oauthAccountRepository.findOne.mockResolvedValue(existingOAuth);

      await service.findOrCreateUserByOAuth(mockGoogleProfile);

      expect(oauthAccountRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: 'google-access-token',
          refreshToken: 'google-refresh-token',
          name: 'Test User',
        }),
      );
    });
  });
});
