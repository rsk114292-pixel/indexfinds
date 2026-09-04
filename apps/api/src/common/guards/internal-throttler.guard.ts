import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { createHash, timingSafeEqual } from 'crypto';

const INTERNAL_API_HEADER = 'x-indexfinds-internal-token';

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

export function matchesInternalApiToken(
  headerValue: string | string[] | undefined,
  expectedToken = process.env.INDEXFINDS_INTERNAL_API_TOKEN,
): boolean {
  const providedToken = Array.isArray(headerValue)
    ? headerValue[0]
    : headerValue;
  if (!expectedToken || !providedToken) return false;

  return timingSafeEqual(digest(providedToken), digest(expectedToken));
}

/**
 * Public requests keep the normal throttles. Authenticated server-rendering
 * requests may bypass them so all tenant SSR traffic is not collapsed into the
 * web container's single private IP address.
 */
@Injectable()
export class InternalThrottlerGuard extends ThrottlerGuard {
  protected shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
    }>();

    return Promise.resolve(
      matchesInternalApiToken(request.headers?.[INTERNAL_API_HEADER]),
    );
  }
}
