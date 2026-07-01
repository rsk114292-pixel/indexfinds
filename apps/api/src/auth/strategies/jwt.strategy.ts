import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { TokenService, JwtPayload } from '../token.service';

// Simple in-memory user cache to avoid DB query on every request
const USER_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
const USER_CACHE_MAX_SIZE = 1000;

interface CachedUser {
  user: any;
  cachedAt: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private userCache = new Map<string, CachedUser>();

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
    private tokenService: TokenService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    let secretOrKey = jwtSecret;
    if (!secretOrKey) {
      const nodeEnv = configService.get<string>('NODE_ENV', 'development');
      if (nodeEnv === 'production') {
        throw new Error('JWT_SECRET 未配置');
      }
      console.warn(
        '[Auth] JWT_SECRET 未配置，已使用开发环境默认值。请在 .env 中配置 JWT_SECRET。',
      );
      secretOrKey = 'dev_jwt_secret_change_me';
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey,
    });
  }

  async validate(payload: JwtPayload) {
    // Check blacklist
    if (payload.jti) {
      const isBlacklisted = await this.tokenService.isAccessTokenBlacklisted(
        payload.jti,
      );
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    // Check user cache first
    const cached = this.userCache.get(payload.sub);
    const now = Date.now();
    if (cached && now - cached.cachedAt < USER_CACHE_TTL_MS) {
      // 密码修改后旧 token 立即失效：检查 token 签发时间是否早于密码修改时间
      if (cached.user.passwordChangedAt && payload.iat) {
        const passwordChangedAtMs = new Date(
          cached.user.passwordChangedAt,
        ).getTime();
        const tokenIssuedAtMs = payload.iat * 1000;
        if (tokenIssuedAtMs < passwordChangedAtMs) {
          this.userCache.delete(payload.sub);
          throw new UnauthorizedException(
            'Token issued before password change',
          );
        }
      }
      return { ...cached.user, jti: payload.jti };
    }

    // Cache miss or expired - query DB
    const user = await this.authService.validateUser(payload.sub);

    // Manage cache size
    if (this.userCache.size >= USER_CACHE_MAX_SIZE) {
      // Remove oldest entries
      const entries = [...this.userCache.entries()];
      entries.sort((a, b) => a[1].cachedAt - b[1].cachedAt);
      for (let i = 0; i < entries.length / 2; i++) {
        this.userCache.delete(entries[i][0]);
      }
    }
    this.userCache.set(payload.sub, { user, cachedAt: now });

    // 密码修改后旧 token 立即失效：检查 token 签发时间是否早于密码修改时间
    if (user.passwordChangedAt && payload.iat) {
      const passwordChangedAtMs = user.passwordChangedAt.getTime();
      const tokenIssuedAtMs = payload.iat * 1000;
      if (tokenIssuedAtMs < passwordChangedAtMs) {
        // Invalidate cache since this user's tokens are no longer valid
        this.userCache.delete(payload.sub);
        throw new UnauthorizedException('Token issued before password change');
      }
    }

    // 将 jti 附加到 user 对象，用于登出时加入黑名单
    return { ...user, jti: payload.jti };
  }
}
