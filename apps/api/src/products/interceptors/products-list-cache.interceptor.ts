import { CacheInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';

function hasValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(
      (item) => typeof item === 'string' && item.trim().length > 0,
    );
  }

  return typeof value === 'string' && value.trim().length > 0;
}

export function shouldBypassProductsListCache(
  query?: Record<string, unknown>,
): boolean {
  if (!query) return false;
  return hasValue(query.search) || hasValue(query.q);
}

@Injectable()
export class ProductsListCacheInterceptor extends CacheInterceptor {
  override trackBy(context: ExecutionContext): string | undefined {
    const request = context
      .switchToHttp()
      .getRequest<Request & { query?: Record<string, unknown> }>();

    if (shouldBypassProductsListCache(request?.query)) {
      return undefined;
    }

    return super.trackBy(context);
  }
}
