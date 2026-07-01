import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  classifyOAuthCallbackError,
  type OAuthCallbackFailureRequest,
} from '../oauth-error.util';

@Injectable()
export class DiscordAuthGuard extends AuthGuard('discord') {
  private readonly logger = new Logger(DiscordAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const result = (await super.canActivate(context)) as boolean;
      return result;
    } catch (error) {
      const req = context.switchToHttp().getRequest<
        OAuthCallbackFailureRequest & {
          query?: Record<string, unknown>;
          url?: string;
          headers?: Record<string, string>;
          user?: unknown;
        }
      >();
      this.logger.error(`Discord OAuth failed: ${error.message}`, {
        hasCode: !!req.query?.code,
        hasState: !!req.query?.state,
        url: req.url?.substring(0, 100),
        userAgent: req.headers?.['user-agent']?.substring(0, 120),
      });
      if (req.query?.code || req.url?.includes('/callback')) {
        req.oauthErrorCode = classifyOAuthCallbackError(error);
        req.user = undefined;
        return true;
      }

      throw error;
    }
  }
}
