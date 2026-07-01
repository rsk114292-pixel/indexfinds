import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginLogService } from './login-log.service';
import { TokenService } from './token.service';
import { OAuthService } from './oauth.service';
import { UploadService } from '../upload/upload.service';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  unlink: jest.fn((_path, cb) => cb(null)),
}));
import * as fs from 'fs';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: Record<string, jest.Mock>;
  let tokenService: Record<string, jest.Mock>;
  let oauthService: Record<string, jest.Mock>;
  let loginLogService: Record<string, jest.Mock>;
  let uploadService: Record<string, jest.Mock>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    avatar: null,
    role: 'user',
    emailVerified: false,
  };

  const mockTokenResult = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    user: mockUser,
  };

  const createMockRequest = (overrides: Record<string, any> = {}) => ({
    ip: '127.0.0.1',
    headers: { 'user-agent': 'test-agent', 'x-forwarded-for': undefined },
    cookies: {},
    user: {
      id: 'user-1',
      jti: 'mock-jti',
      email: 'test@example.com',
      ...overrides.user,
    },
    ...overrides,
  });

  const createMockResponse = () => {
    const res: Record<string, jest.Mock> = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
      redirect: jest.fn(),
      setHeader: jest.fn(),
    };
    return res;
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn().mockResolvedValue(mockTokenResult),
      login: jest.fn().mockResolvedValue(mockTokenResult),
      changePassword: jest.fn().mockResolvedValue(undefined),
      refreshAccessToken: jest.fn().mockResolvedValue(mockTokenResult),
      logout: jest.fn().mockResolvedValue(undefined),
      logoutAll: jest.fn().mockResolvedValue(undefined),
      forgotPassword: jest.fn().mockResolvedValue(undefined),
      resetPassword: jest.fn().mockResolvedValue(undefined),
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      verifyEmail: jest.fn().mockResolvedValue(undefined),
      updateAvatar: jest
        .fn()
        .mockResolvedValue({ avatar: 'http://localhost/uploads/avatar.png' }),
      updateUsername: jest.fn().mockResolvedValue({ username: 'newname' }),
      getRefreshTokenCookieOptions: jest.fn().mockReturnValue({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/',
      }),
      handleOAuthLogin: jest.fn(),
      getOAuthCallbackRedirectUrl: jest
        .fn()
        .mockImplementation(
          ({
            code,
            error,
            provider,
          }: {
            code?: string;
            error?: string;
            provider?: string;
          }) => {
            const searchParams = new URLSearchParams();
            if (code) searchParams.set('code', code);
            if (error) searchParams.set('error', error);
            if (provider) searchParams.set('provider', provider);
            return `http://localhost:3101/auth/callback?${searchParams.toString()}`;
          },
        ),
      validateUser: jest.fn(),
    };

    tokenService = {
      generateOAuthCode: jest.fn(),
      exchangeOAuthCode: jest.fn(),
      getUserSessions: jest.fn().mockResolvedValue([]),
      revokeSession: jest.fn().mockResolvedValue(true),
    };

    oauthService = {
      getLinkedAccounts: jest.fn().mockResolvedValue([]),
      unlinkOAuthAccount: jest.fn().mockResolvedValue(undefined),
    };

    loginLogService = {
      getLoginLogs: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      getLoginStats: jest.fn().mockResolvedValue({}),
    };

    uploadService = {
      validateImageFile: jest.fn(),
      getFileUrl: jest
        .fn()
        .mockReturnValue('http://localhost/uploads/avatar.png'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: LoginLogService, useValue: loginLogService },
        { provide: TokenService, useValue: tokenService },
        { provide: OAuthService, useValue: oauthService },
        { provide: UploadService, useValue: uploadService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============ Register ============

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'StrongP@ss1',
      username: 'newuser',
    };

    it('should register user, set refresh cookie, and return accessToken + user', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      const result = await controller.register(
        registerDto,
        req as any,
        res as any,
      );

      expect(authService.register).toHaveBeenCalledWith(
        registerDto,
        undefined, // no referral cookie
        '127.0.0.1',
        'test-agent',
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'mock-refresh-token',
        expect.objectContaining({ httpOnly: true, path: '/' }),
      );
      expect(result).toEqual({
        accessToken: 'mock-access-token',
        user: mockUser,
      });
    });

    it('should pass sanitized referral cookie when present', async () => {
      const req = createMockRequest({
        cookies: { mf_ref_attrib: 'ref-code_123' },
      });
      const res = createMockResponse();

      await controller.register(registerDto, req as any, res as any);

      expect(authService.register).toHaveBeenCalledWith(
        registerDto,
        'ref-code_123',
        expect.any(String),
        expect.any(String),
      );
    });

    it('should reject malicious referral cookie values', async () => {
      const req = createMockRequest({
        cookies: { mf_ref_attrib: '<script>alert(1)</script>' },
      });
      const res = createMockResponse();

      await controller.register(registerDto, req as any, res as any);

      expect(authService.register).toHaveBeenCalledWith(
        registerDto,
        undefined, // malicious value filtered out
        expect.any(String),
        expect.any(String),
      );
    });

    it('should use x-forwarded-for when req.ip is absent', async () => {
      const req = createMockRequest({
        ip: undefined,
        headers: {
          'user-agent': 'test-agent',
          'x-forwarded-for': '10.0.0.1, 10.0.0.2',
        },
      });
      const res = createMockResponse();

      await controller.register(registerDto, req as any, res as any);

      expect(authService.register).toHaveBeenCalledWith(
        registerDto,
        undefined,
        '10.0.0.1', // first IP from x-forwarded-for
        'test-agent',
      );
    });
  });

  // ============ Login ============

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'StrongP@ss1' };

    it('should login user, set refresh cookie, and return accessToken + user', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      const result = await controller.login(loginDto, req as any, res as any);

      expect(authService.login).toHaveBeenCalledWith(
        loginDto,
        '127.0.0.1',
        'test-agent',
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'mock-refresh-token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({
        accessToken: 'mock-access-token',
        user: mockUser,
      });
    });

    it('should propagate UnauthorizedException from service', async () => {
      authService.login.mockRejectedValue(
        new UnauthorizedException({
          code: 'AUTH_INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        }),
      );
      const req = createMockRequest();
      const res = createMockResponse();

      await expect(
        controller.login(loginDto, req as any, res as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ============ Change Password ============

  describe('changePassword', () => {
    it('should change password and return success message', async () => {
      const req = createMockRequest();
      const dto = { currentPassword: 'OldP@ss1', newPassword: 'NewP@ss1!' };

      const result = await controller.changePassword(dto as any, req as any);

      expect(authService.changePassword).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual({ message: 'Password changed successfully' });
    });
  });

  // ============ Get Profile ============

  describe('getProfile', () => {
    it('should return user profile from JWT payload', () => {
      const req = createMockRequest({
        user: {
          id: 'user-1',
          email: 'test@example.com',
          username: 'testuser',
          avatar: null,
          role: 'user',
          emailVerified: false,
        },
      });

      const result = controller.getProfile(req as any);

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        avatar: null,
        role: 'user',
        emailVerified: false,
      });
    });
  });

  // ============ Refresh ============

  describe('refresh', () => {
    it('should refresh tokens using cookie and set new refresh cookie', async () => {
      const req = createMockRequest({
        cookies: { refresh_token: 'old-refresh-token' },
      });
      const res = createMockResponse();

      const result = await controller.refresh(req as any, res as any);

      expect(authService.refreshAccessToken).toHaveBeenCalledWith(
        'old-refresh-token',
        '127.0.0.1',
        'test-agent',
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'mock-refresh-token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({
        accessToken: 'mock-access-token',
        user: mockUser,
      });
    });

    it('should throw UnauthorizedException when no refresh cookie', async () => {
      const req = createMockRequest({ cookies: {} });
      const res = createMockResponse();

      await expect(controller.refresh(req as any, res as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ============ Logout ============

  describe('logout', () => {
    it('should call service logout, clear cookie, and return success', async () => {
      const req = createMockRequest({
        cookies: { refresh_token: 'token-to-revoke' },
      });
      const res = createMockResponse();

      const result = await controller.logout(req as any, res as any);

      expect(authService.logout).toHaveBeenCalledWith(
        'token-to-revoke',
        'mock-jti',
        'user-1',
        '127.0.0.1',
        'test-agent',
      );
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', {
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      });
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  // ============ Logout All ============

  describe('logoutAll', () => {
    it('should revoke all sessions and clear cookie', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      const result = await controller.logoutAll(req as any, res as any);

      expect(authService.logoutAll).toHaveBeenCalledWith('user-1', 'mock-jti');
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', {
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      });
      expect(result).toEqual({ message: 'Logged out from all devices' });
    });
  });

  // ============ Forgot Password ============

  describe('forgotPassword', () => {
    it('should call service and return generic message (no user enumeration)', async () => {
      const result = await controller.forgotPassword({
        email: 'anyone@example.com',
      });

      expect(authService.forgotPassword).toHaveBeenCalledWith(
        'anyone@example.com',
      );
      expect(result).toEqual({
        message: 'If the email exists, a reset link has been sent',
      });
    });
  });

  // ============ Reset Password ============

  describe('resetPassword', () => {
    it('should reset password and return success', async () => {
      const dto = { token: 'reset-token', newPassword: 'NewP@ss123!' };

      const result = await controller.resetPassword(dto);

      expect(authService.resetPassword).toHaveBeenCalledWith(
        'reset-token',
        'NewP@ss123!',
      );
      expect(result).toEqual({
        message: 'Password has been reset successfully',
      });
    });
  });

  // ============ Email Verification ============

  describe('sendVerificationEmail', () => {
    it('should trigger verification email', async () => {
      const req = createMockRequest();

      const result = await controller.sendVerificationEmail(req as any);

      expect(authService.sendVerificationEmail).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ message: 'Verification email sent' });
    });
  });

  describe('verifyEmail', () => {
    it('should verify email token and return success', async () => {
      const result = await controller.verifyEmail({ token: 'verify-token' });

      expect(authService.verifyEmail).toHaveBeenCalledWith('verify-token');
      expect(result).toEqual({ message: 'Email verified successfully' });
    });
  });

  describe('oauthCallback', () => {
    it('should pass sanitized referral cookie to OAuth login flow', async () => {
      authService.handleOAuthLogin.mockResolvedValue({
        redirectUrl: 'http://localhost:3101/auth/callback?code=test-code',
      });
      const req = createMockRequest({
        cookies: {
          mf_ref_attrib:
            'ref_click_id=click-1&referral_code=ABC123&exp=9999999999999',
        },
        user: mockUser,
      });
      const res = createMockResponse();

      await controller.googleCallback(req as any, res as any);

      expect(authService.handleOAuthLogin).toHaveBeenCalledWith(
        mockUser,
        'google',
        '127.0.0.1',
        'test-agent',
        'ref_click_id=click-1&referral_code=ABC123&exp=9999999999999',
      );
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:3101/auth/callback?code=test-code',
      );
    });

    it('should redirect OAuth callback failures to frontend error page', async () => {
      const req = createMockRequest({
        oauthErrorCode: 'provider_timeout',
        user: undefined,
      });
      const res = createMockResponse();

      await controller.googleCallback(req as any, res as any);

      expect(authService.handleOAuthLogin).not.toHaveBeenCalled();
      expect(authService.getOAuthCallbackRedirectUrl).toHaveBeenCalledWith({
        error: 'provider_timeout',
        provider: 'google',
      });
      expect(res.setHeader).toHaveBeenCalledWith(
        'Referrer-Policy',
        'no-referrer',
      );
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:3101/auth/callback?error=provider_timeout&provider=google',
      );
    });
  });

  // ============ Exchange Code ============

  describe('exchangeCode', () => {
    it('should exchange valid code for access token and set refresh cookie', async () => {
      tokenService.exchangeOAuthCode.mockResolvedValue({
        accessToken: 'oauth-access-token',
        refreshToken: 'oauth-refresh-token',
        userId: 'user-1',
      });
      const res = createMockResponse();

      const result = await controller.exchangeCode('valid-code', res as any);

      expect(tokenService.exchangeOAuthCode).toHaveBeenCalledWith('valid-code');
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'oauth-refresh-token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({ accessToken: 'oauth-access-token' });
    });

    it('should throw BadRequestException when code is empty', async () => {
      const res = createMockResponse();

      await expect(controller.exchangeCode('', res as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw UnauthorizedException when code is invalid/expired', async () => {
      tokenService.exchangeOAuthCode.mockResolvedValue(null);
      const res = createMockResponse();

      await expect(
        controller.exchangeCode('invalid-code', res as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ============ OAuth Account Management ============

  describe('getLinkedAccounts', () => {
    it('should return linked OAuth accounts for authenticated user', async () => {
      oauthService.getLinkedAccounts.mockResolvedValue([
        { provider: 'google', email: 'test@gmail.com' },
      ]);
      const req = createMockRequest();

      const result = await controller.getLinkedAccounts(req as any);

      expect(oauthService.getLinkedAccounts).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([{ provider: 'google', email: 'test@gmail.com' }]);
    });
  });

  describe('unlinkOAuthAccount', () => {
    it('should unlink valid OAuth provider', async () => {
      const req = createMockRequest();

      const result = await controller.unlinkOAuthAccount(req as any, 'google');

      expect(oauthService.unlinkOAuthAccount).toHaveBeenCalledWith(
        'user-1',
        'google',
      );
      expect(result).toEqual({
        message: 'google account unlinked successfully',
      });
    });

    it('should throw BadRequestException for invalid provider', async () => {
      const req = createMockRequest();

      await expect(
        controller.unlinkOAuthAccount(req as any, 'invalid-provider'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============ Session Management ============

  describe('getSessions', () => {
    it('should return mapped session data', async () => {
      tokenService.getUserSessions.mockResolvedValue([
        {
          id: 'session-1',
          deviceInfo: 'Chrome',
          ipAddress: '127.0.0.1',
          createdAt: new Date('2025-01-01'),
          expiresAt: new Date('2025-02-01'),
          tokenHash: 'should-not-be-exposed',
          userId: 'should-not-be-exposed',
        },
      ]);
      const req = createMockRequest();

      const result = await controller.getSessions(req as any);

      expect(result).toEqual([
        {
          id: 'session-1',
          deviceInfo: 'Chrome',
          ipAddress: '127.0.0.1',
          createdAt: expect.any(Date),
          expiresAt: expect.any(Date),
        },
      ]);
      // Verify sensitive fields are NOT exposed
      expect(result[0]).not.toHaveProperty('tokenHash');
      expect(result[0]).not.toHaveProperty('userId');
    });
  });

  describe('revokeSession', () => {
    it('should revoke the specified session', async () => {
      const req = createMockRequest();

      const result = await controller.revokeSession(req as any, 'session-1');

      expect(tokenService.revokeSession).toHaveBeenCalledWith(
        'user-1',
        'session-1',
      );
      expect(result).toEqual({ message: 'Session revoked' });
    });
  });

  // ============ Update Username ============

  describe('updateUsername', () => {
    it('should update username and return new value', async () => {
      const req = createMockRequest();

      const result = await controller.updateUsername(
        { username: '  newname  ' } as any,
        req as any,
      );

      expect(authService.updateUsername).toHaveBeenCalledWith(
        'user-1',
        'newname',
      );
      expect(result).toEqual({ username: 'newname' });
    });
  });

  // ============ Upload Avatar ============

  describe('uploadAvatar', () => {
    it('should validate file, upload, and return avatar URL', async () => {
      const req = createMockRequest();
      const mockFile = {
        filename: 'avatar-abc123.png',
        originalname: 'photo.png',
      } as Express.Multer.File;

      const result = await controller.uploadAvatar(mockFile, req as any);

      expect(uploadService.validateImageFile).toHaveBeenCalledWith(mockFile);
      expect(uploadService.getFileUrl).toHaveBeenCalledWith(
        'avatar-abc123.png',
      );
      expect(authService.updateAvatar).toHaveBeenCalledWith(
        'user-1',
        'http://localhost/uploads/avatar.png',
      );
      expect(result).toEqual({ avatar: 'http://localhost/uploads/avatar.png' });
    });

    it('should throw BadRequestException when no file uploaded', async () => {
      const req = createMockRequest();

      await expect(
        controller.uploadAvatar(undefined as any, req as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should clean up file on disk when validation fails', async () => {
      const req = createMockRequest();
      const mockFile = {
        filename: 'avatar-abc123.png',
        originalname: 'malicious.png',
        path: '/tmp/uploads/avatar-abc123.png',
      } as Express.Multer.File;

      uploadService.validateImageFile.mockImplementation(() => {
        throw new BadRequestException(
          'File content does not match declared MIME type',
        );
      });

      (fs.unlink as unknown as jest.Mock).mockClear();

      await expect(
        controller.uploadAvatar(mockFile, req as any),
      ).rejects.toThrow(BadRequestException);
      expect(fs.unlink).toHaveBeenCalledWith(
        '/tmp/uploads/avatar-abc123.png',
        expect.any(Function),
      );
    });
  });

  // ============ Admin Endpoints ============

  describe('getLoginLogs', () => {
    it('should pass parsed query params to service', async () => {
      await controller.getLoginLogs('2', '10', undefined, 'test@example.com');

      expect(loginLogService.getLoginLogs).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        eventType: undefined,
        email: 'test@example.com',
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('should use defaults when no query params provided', async () => {
      await controller.getLoginLogs();

      expect(loginLogService.getLoginLogs).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        eventType: undefined,
        email: undefined,
        startDate: undefined,
        endDate: undefined,
      });
    });
  });

  describe('getLoginStats', () => {
    it('should return login stats', async () => {
      loginLogService.getLoginStats.mockResolvedValue({ total: 100 });

      const result = await controller.getLoginStats();

      expect(result).toEqual({ total: 100 });
    });
  });
});
