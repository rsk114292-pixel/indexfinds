import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  VerifyCallback,
  Profile,
  StrategyOptions,
} from 'passport-google-oauth20';
import Redis from 'ioredis';
import { OAuthService, OAuthProfile } from '../oauth.service';
import { OAuthProvider } from '../entities/user-oauth-account.entity';
import { RedisOAuthStateStore } from '../oauth-state.store';
import { wrapOAuth2WithRetry } from './oauth-retry.util';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly oauthService: OAuthService,
    @Inject('REDIS_CLIENT') redis: Redis,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
      state: true,
      store: new RedisOAuthStateStore(redis),
    } as StrategyOptions);

    wrapOAuth2WithRetry(this, this.logger, 'Google');
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const { id, emails, displayName, photos } = profile;

    const oauthProfile: OAuthProfile = {
      provider: OAuthProvider.GOOGLE,
      providerAccountId: id,
      email: emails?.[0]?.value,
      emailVerified: (emails?.[0] as any)?.verified ?? false,
      name: displayName,
      avatar: photos?.[0]?.value,
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
