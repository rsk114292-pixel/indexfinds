import {
  Injectable,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import {
  UserOAuthAccount,
  OAuthProvider,
} from './entities/user-oauth-account.entity';

export interface OAuthProfile {
  provider: OAuthProvider;
  providerAccountId: string;
  email?: string;
  /** Whether the OAuth provider has verified this email */
  emailVerified?: boolean;
  name?: string;
  avatar?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface OAuthAuthContext {
  isNewUser: boolean;
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserOAuthAccount)
    private readonly oauthAccountRepository: Repository<UserOAuthAccount>,
  ) {}

  private attachAuthContext<T extends User>(
    user: T,
    context: OAuthAuthContext,
  ): T {
    Object.defineProperty(user, '__oauthContext', {
      value: context,
      enumerable: false,
      configurable: true,
      writable: false,
    });
    return user;
  }

  /**
   * 通过 OAuth 登录查找或创建用户
   * 实现账号合并策略：
   * 1. OAuth 账号已存在 -> 直接返回关联用户
   * 2. OAuth 邮箱已存在（密码注册） -> 自动绑定到已有用户
   * 3. OAuth 邮箱不存在 -> 创建新用户
   */
  async findOrCreateUserByOAuth(profile: OAuthProfile): Promise<User> {
    // 1. 先查找是否已有此 OAuth 账号
    const existingOAuth = await this.oauthAccountRepository.findOne({
      where: {
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
      },
      relations: ['user'],
    });

    if (existingOAuth) {
      this.logger.log(
        `Existing OAuth account found for user: ${existingOAuth.user.email}, provider: ${profile.provider}`,
      );

      // 更新 OAuth 账号信息（token 等可能会变）
      await this.updateOAuthAccount(existingOAuth, profile);

      // 同步头像到 User 表（如果用户没有头像但 OAuth 有）
      if (!existingOAuth.user.avatar && profile.avatar) {
        existingOAuth.user.avatar = profile.avatar;
        await this.userRepository.save(existingOAuth.user);
      }

      return this.attachAuthContext(existingOAuth.user, { isNewUser: false });
    }

    // 2. 查找是否有相同邮箱的用户（账号合并）
    //    仅在 OAuth 提供商已验证邮箱时才允许自动合并，防止未验证邮箱接管账号
    let user: User | null = null;

    if (profile.email && profile.emailVerified) {
      user = await this.userRepository.findOne({
        where: { email: profile.email },
      });

      if (user) {
        this.logger.log(
          `Email exists, auto-linking OAuth account: ${profile.email}, provider: ${profile.provider}`,
        );

        // 同步头像到 User 表（如果用户没有头像但 OAuth 有）
        if (!user.avatar && profile.avatar) {
          user.avatar = profile.avatar;
          await this.userRepository.save(user);
        }
      }
    } else if (profile.email && !profile.emailVerified) {
      this.logger.warn(
        `OAuth email not verified, skipping auto-link: ${profile.email}, provider: ${profile.provider}`,
      );
    }

    // 3. 创建新用户（如果邮箱不存在）
    const isNewUser = !user;

    if (!user) {
      const isEmailVerified = !!profile.emailVerified;
      user = this.userRepository.create({
        email:
          profile.email ||
          `${profile.provider}_${profile.providerAccountId}@oauth.local`,
        username: profile.name,
        avatar: profile.avatar,
        emailVerified: isEmailVerified,
        emailVerifiedAt: isEmailVerified ? new Date() : undefined,
        // 社交登录用户无密码，不设置 password 字段即可（nullable）
      });

      await this.userRepository.save(user);
      this.logger.log(
        `New user created: ${user.email}, provider: ${profile.provider}`,
      );
    }

    // 4. 创建 OAuth 账号关联
    const oauthAccount = this.oauthAccountRepository.create({
      userId: user.id,
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
      email: profile.email,
      name: profile.name,
      avatar: profile.avatar,
      accessToken: profile.accessToken,
      refreshToken: profile.refreshToken,
      expiresAt: profile.expiresAt,
    });

    await this.oauthAccountRepository.save(oauthAccount);

    return this.attachAuthContext(user, { isNewUser });
  }

  /**
   * 绑定社交账号到已登录用户
   */
  async linkOAuthAccount(userId: string, profile: OAuthProfile): Promise<void> {
    // 检查该 OAuth 账号是否已被其他用户绑定
    const existingOAuth = await this.oauthAccountRepository.findOne({
      where: {
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
      },
    });

    if (existingOAuth) {
      if (existingOAuth.userId === userId) {
        // 已绑定到当前用户，更新信息
        await this.updateOAuthAccount(existingOAuth, profile);
        return;
      }
      throw new ConflictException('AUTH_OAUTH_ALREADY_LINKED');
    }

    // 检查当前用户是否已绑定同一 provider
    const userExistingOAuth = await this.oauthAccountRepository.findOne({
      where: {
        userId,
        provider: profile.provider,
      },
    });

    if (userExistingOAuth) {
      throw new ConflictException('AUTH_OAUTH_PROVIDER_DUPLICATE');
    }

    // 创建新的 OAuth 关联
    const oauthAccount = this.oauthAccountRepository.create({
      userId,
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
      email: profile.email,
      name: profile.name,
      avatar: profile.avatar,
      accessToken: profile.accessToken,
      refreshToken: profile.refreshToken,
      expiresAt: profile.expiresAt,
    });

    await this.oauthAccountRepository.save(oauthAccount);
    this.logger.log(`User ${userId} linked ${profile.provider} account`);
  }

  /**
   * 解绑社交账号
   */
  async unlinkOAuthAccount(
    userId: string,
    provider: OAuthProvider,
  ): Promise<void> {
    // 检查用户是否有密码或其他 OAuth 账号（确保至少有一种登录方式）
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('AUTH_USER_NOT_FOUND');
    }

    const oauthAccounts = await this.oauthAccountRepository.find({
      where: { userId },
    });

    const hasPassword = !!user.password;
    const hasOtherOAuth = oauthAccounts.some(
      (acc) => acc.provider !== provider,
    );

    if (!hasPassword && !hasOtherOAuth) {
      throw new BadRequestException('AUTH_OAUTH_LAST_LOGIN_METHOD');
    }

    const result = await this.oauthAccountRepository.delete({
      userId,
      provider,
    });

    if (result.affected === 0) {
      throw new BadRequestException('AUTH_OAUTH_NOT_LINKED');
    }

    this.logger.log(`User ${userId} unlinked ${provider} account`);
  }

  /**
   * 获取用户已绑定的社交账号列表
   */
  async getLinkedAccounts(
    userId: string,
  ): Promise<{ provider: OAuthProvider; email?: string; name?: string }[]> {
    const accounts = await this.oauthAccountRepository.find({
      where: { userId },
      select: ['provider', 'email', 'name'],
    });

    return accounts.map((acc) => ({
      provider: acc.provider,
      email: acc.email,
      name: acc.name,
    }));
  }

  /**
   * 更新 OAuth 账号信息
   */
  private async updateOAuthAccount(
    account: UserOAuthAccount,
    profile: OAuthProfile,
  ): Promise<void> {
    account.accessToken = profile.accessToken;
    account.refreshToken = profile.refreshToken;
    account.expiresAt = profile.expiresAt;

    if (profile.name) account.name = profile.name;
    if (profile.avatar) account.avatar = profile.avatar;
    if (profile.email) account.email = profile.email;

    await this.oauthAccountRepository.save(account);
  }
}
