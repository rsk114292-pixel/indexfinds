import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, StrategyOptions } from 'passport-discord';
import Redis from 'ioredis';
import { OAuthService, OAuthProfile } from '../oauth.service';
import { OAuthProvider } from '../entities/user-oauth-account.entity';
import { RedisOAuthStateStore } from '../oauth-state.store';
import { wrapOAuth2WithRetry } from './oauth-retry.util';

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, 'discord') {
  private readonly logger = new Logger(DiscordStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly oauthService: OAuthService,
    @Inject('REDIS_CLIENT') redis: Redis,
  ) {
    super({
      clientID: configService.get<string>('DISCORD_CLIENT_ID'),
      clientSecret: configService.get<string>('DISCORD_CLIENT_SECRET'),
      callbackURL: configService.get<string>('DISCORD_CALLBACK_URL'),
      scope: ['identify', 'email'],
      state: true,
      store: new RedisOAuthStateStore(redis),
    } as StrategyOptions);

    wrapOAuth2WithRetry(this, this.logger, 'Discord');
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: Error | null, user?: any) => void,
  ): Promise<void> {
    const { id, email, username, avatar, verified } = profile;

    // Discord avatar URL 格式
    const avatarUrl = avatar
      ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`
      : undefined;

    const oauthProfile: OAuthProfile = {
      provider: OAuthProvider.DISCORD,
      providerAccountId: id,
      email: email || undefined,
      emailVerified: verified ?? false,
      name: username,
      avatar: avatarUrl,
      accessToken,
      refreshToken,
    };

    try {
      const user =
        await this.oauthService.findOrCreateUserByOAuth(oauthProfile);
      done(null, user);
    } catch (error) {
      done(error as Error, undefined);
    }
  }
}
