import {
  Controller,
  Post,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  Req,
  Res,
  Query,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { Throttle } from '@nestjs/throttler';
import type { Request as ExpressRequest, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginLogService } from './login-log.service';
import { LoginEventType, LoginProvider } from './entities/login-log.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { UpdateUsernameDto } from './dto/update-username.dto';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { TokenService } from './token.service';
import { OAuthService } from './oauth.service';
import { OAuthProvider } from './entities/user-oauth-account.entity';
import { UploadService } from '../upload/upload.service';
import { RATE_LIMIT } from './auth.constants';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { UpdatePreferencesDto } from '../users/dto/update-preferences.dto';
import type {
  OAuthCallbackErrorCode,
  OAuthCallbackFailureRequest,
} from './oauth-error.util';

const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly loginLogService: LoginLogService,
    private readonly tokenService: TokenService,
    private readonly oauthService: OAuthService,
    private readonly uploadService: UploadService,
  ) {}

  /** 设置 Refresh Token Cookie（统一入口，消除重复） */
  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    res.cookie(
      REFRESH_TOKEN_COOKIE_NAME,
      refreshToken,
      this.authService.getRefreshTokenCookieOptions(),
    );
  }

  private getSanitizedReferralCookie(rawReferral?: string): string | undefined {
    return rawReferral && /^[a-zA-Z0-9=&_\-%.]{1,512}$/.test(rawReferral)
      ? rawReferral
      : undefined;
  }

  @Public()
  @Throttle({ long: RATE_LIMIT.REGISTER })
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const referralCookie = this.getSanitizedReferralCookie(
      req.cookies?.['mf_ref_attrib'],
    );
    const forwardedFor = req.headers['x-forwarded-for']?.toString();
    const ipAddress = req.ip || forwardedFor?.split(',')[0]?.trim();
    const deviceInfo = req.headers['user-agent'];

    const result = await this.authService.register(
      registerDto,
      referralCookie,
      ipAddress,
      deviceInfo,
    );

    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @Throttle({ long: RATE_LIMIT.LOGIN })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const forwardedFor = req.headers['x-forwarded-for']?.toString();
    const ipAddress = req.ip || forwardedFor?.split(',')[0]?.trim();
    const deviceInfo = req.headers['user-agent'];

    const result = await this.authService.login(
      loginDto,
      ipAddress,
      deviceInfo,
    );

    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  /**
   * 修改密码
   */
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.authService.changePassword(req.user.id, changePasswordDto);
    return { message: 'Password changed successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req: AuthenticatedRequest) {
    return {
      id: req.user.id,
      email: req.user.email,
      username: req.user.username,
      avatar: req.user.avatar,
      role: req.user.role,
      emailVerified: req.user.emailVerified,
      preferredCurrency: req.user.preferredCurrency,
      preferredPlatform: req.user.preferredPlatform,
    };
  }

  /**
   * 更新用户偏好设置（货币、平台）
   */
  @UseGuards(JwtAuthGuard)
  @Patch('me/preferences')
  @HttpCode(HttpStatus.OK)
  async updatePreferences(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.authService.updatePreferences(req.user.id, dto);
  }

  /**
   * 更新用户昵称
   */
  @UseGuards(JwtAuthGuard)
  @Patch('username')
  @HttpCode(HttpStatus.OK)
  async updateUsername(
    @Body() dto: UpdateUsernameDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.authService.updateUsername(req.user.id, dto.username.trim());
  }

  /**
   * 上传/更新用户头像
   */
  @UseGuards(JwtAuthGuard)
  @Patch('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const randomName = crypto.randomBytes(16).toString('hex');
          cb(null, `avatar-${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Only image files are allowed (JPEG, PNG, WebP, GIF)',
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    try {
      this.uploadService.validateImageFile(file);
    } catch (error) {
      if (file.path) {
        fs.unlink(file.path, () => {});
      }
      throw error;
    }
    const avatarUrl = this.uploadService.getFileUrl(file.filename);
    const result = await this.authService.updateAvatar(req.user.id, avatarUrl);
    return result;
  }

  /**
   * 刷新 Access Token
   */
  @Public()
  @Throttle({ long: { ttl: 60000, limit: 10 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const ipAddress =
      req.ip ||
      req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim();
    const deviceInfo = req.headers['user-agent'];

    const result = await this.authService.refreshAccessToken(
      refreshToken,
      ipAddress,
      deviceInfo,
    );

    // 仅在实际轮换时设置新 cookie（grace period 竞态返回时 refreshToken 为空）
    if (result.refreshToken) {
      this.setRefreshTokenCookie(res, result.refreshToken);
    }

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  /**
   * 登出（撤销当前会话）
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
    const jti = req.user?.jti;
    const userId = req.user?.id;
    const ipAddress =
      req.ip ||
      req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim();
    const deviceInfo = req.headers['user-agent'];

    await this.authService.logout(
      refreshToken,
      jti,
      userId,
      ipAddress,
      deviceInfo,
    );

    // 清除 Refresh Token Cookie
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
    });

    return { message: 'Logged out successfully' };
  }

  /**
   * 登出所有设备
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = req.user.id;
    const jti = req.user?.jti;

    await this.authService.logoutAll(userId, jti);

    // 清除 Refresh Token Cookie
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
    });

    return { message: 'Logged out from all devices' };
  }

  // ============ 邮箱验证 + 密码重置端点 ============

  /**
   * 忘记密码 — 发送重置邮件
   */
  @Public()
  @Throttle({ long: RATE_LIMIT.FORGOT_PASSWORD })
  @Post('password/forgot')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: 'If the email exists, a reset link has been sent' };
  }

  /**
   * 重置密码 — 通过邮件 token
   */
  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password has been reset successfully' };
  }

  /**
   * 发送邮箱验证邮件
   */
  @UseGuards(JwtAuthGuard)
  @Post('email/send-verification')
  @HttpCode(HttpStatus.OK)
  async sendVerificationEmail(@Request() req: AuthenticatedRequest) {
    await this.authService.sendVerificationEmail(req.user.id);
    return { message: 'Verification email sent' };
  }

  /**
   * 验证邮箱 — 通过邮件 token
   */
  @Public()
  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto.token);
    return { message: 'Email verified successfully' };
  }

  // ============ OAuth 登录端点 ============

  /**
   * Google 登录入口
   */
  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleLogin() {
    // Guard 会自动重定向到 Google 授权页面
  }

  /**
   * Google 登录回调
   */
  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    return this.handleOAuthCallback(req, res, LoginProvider.GOOGLE);
  }

  /**
   * OAuth 回调共享逻辑：委托 Service 处理业务，Controller 仅负责重定向
   */
  private async handleOAuthCallback(
    req: ExpressRequest &
      OAuthCallbackFailureRequest & {
        user?: any;
      },
    res: Response,
    provider: LoginProvider,
  ) {
    if (req.oauthErrorCode) {
      return this.redirectOAuthFailure(res, provider, req.oauthErrorCode);
    }

    if (!req.user) {
      return this.redirectOAuthFailure(res, provider, 'provider_error');
    }

    const ipAddress =
      req.ip ||
      req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim();
    const deviceInfo = req.headers['user-agent'];

    const referralCookie = this.getSanitizedReferralCookie(
      req.cookies?.['mf_ref_attrib'],
    );

    const { redirectUrl } = await this.authService.handleOAuthLogin(
      req.user,
      provider,
      ipAddress,
      deviceInfo,
      referralCookie,
    );

    // 防止 code 通过 Referer header 泄漏到第三方站点
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.redirect(redirectUrl);
  }

  private redirectOAuthFailure(
    res: Response,
    provider: LoginProvider,
    errorCode: OAuthCallbackErrorCode,
  ) {
    const redirectUrl = this.authService.getOAuthCallbackRedirectUrl({
      error: errorCode,
      provider,
    });

    res.setHeader('Referrer-Policy', 'no-referrer');
    res.redirect(redirectUrl);
  }

  /**
   * 用一次性 code 交换 Token
   * 安全地获取 accessToken（通过 POST body 而非 URL）
   */
  @Public()
  @Throttle({ long: { ttl: 60000, limit: 5 } })
  @Post('exchange')
  @HttpCode(HttpStatus.OK)
  async exchangeCode(
    @Body('code') code: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!code) {
      throw new BadRequestException('Code is required');
    }

    const tokenData = await this.tokenService.exchangeOAuthCode(code);

    if (!tokenData) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    this.setRefreshTokenCookie(res, tokenData.refreshToken);

    return {
      accessToken: tokenData.accessToken,
    };
  }

  // ============ OAuth 账号管理端点 ============

  /**
   * 获取已绑定的社交账号列表
   */
  @UseGuards(JwtAuthGuard)
  @Get('oauth/accounts')
  async getLinkedAccounts(@Request() req: AuthenticatedRequest) {
    return this.oauthService.getLinkedAccounts(req.user.id);
  }

  /**
   * 解绑社交账号
   */
  @UseGuards(JwtAuthGuard)
  @Delete('oauth/:provider')
  @HttpCode(HttpStatus.OK)
  async unlinkOAuthAccount(
    @Request() req: AuthenticatedRequest,
    @Param('provider') provider: string,
  ) {
    // 验证 provider 是否有效
    if (!Object.values(OAuthProvider).includes(provider as OAuthProvider)) {
      throw new BadRequestException(`Invalid provider: ${provider}`);
    }

    await this.oauthService.unlinkOAuthAccount(
      req.user.id,
      provider as OAuthProvider,
    );

    return { message: `${provider} account unlinked successfully` };
  }

  // ============ 会话管理端点 ============

  /**
   * 获取当前用户的活跃会话列表
   */
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async getSessions(@Request() req: AuthenticatedRequest) {
    const sessions = await this.tokenService.getUserSessions(req.user.id);
    return sessions.map((s) => ({
      id: s.id,
      deviceInfo: s.deviceInfo,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    }));
  }

  /**
   * 撤销指定会话
   */
  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  async revokeSession(
    @Request() req: AuthenticatedRequest,
    @Param('id') sessionId: string,
  ) {
    await this.tokenService.revokeSession(req.user.id, sessionId);
    return { message: 'Session revoked' };
  }

  // ============ 管理员端点 ============

  /**
   * 管理员：获取登录日志列表
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/login-logs')
  async getLoginLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('eventType') eventType?: LoginEventType,
    @Query('email') email?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.loginLogService.getLoginLogs({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      eventType,
      email,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  /**
   * 管理员：获取登录统计概览
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/login-stats')
  async getLoginStats() {
    return this.loginLogService.getLoginStats();
  }
}
