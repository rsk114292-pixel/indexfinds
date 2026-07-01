import { CACHE_MANAGER, CacheInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Cache } from 'cache-manager';
import type { Request } from 'express';

const BY_PRODUCT_CACHE_VERSION = 'v2';
const BY_PRODUCT_MAX_LIMIT = 24;
export const VISUAL_SEARCH_BY_PRODUCT_CACHE_TTL_MS = 3600000;

function firstQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : undefined;
  }
  return typeof value === 'string' ? value : undefined;
}

function clampQueryInt(
  value: unknown,
  defaultValue: number,
  min: number,
  max: number,
): number {
  const parsed = parseInt(firstQueryValue(value) || String(defaultValue), 10);
  const safeValue =
    Number.isFinite(parsed) && parsed >= min ? parsed : defaultValue;
  return Math.min(Math.max(safeValue, min), max);
}

export function getVisualSearchByProductCacheKey(
  productId: string,
  limit: number,
  minSimilarity: number,
): string {
  return [
    'visual-search',
    'by-product',
    BY_PRODUCT_CACHE_VERSION,
    productId,
    `limit=${limit}`,
    `minSimilarity=${minSimilarity}`,
  ].join(':');
}

@Injectable()
export class VisualSearchByProductCacheInterceptor extends CacheInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) cacheManager: Cache,
    reflector: Reflector,
  ) {
    super(cacheManager, reflector);
  }

  override trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest<
      Request & {
        params?: { productId?: string };
        query?: Record<string, unknown>;
      }
    >();

    if (request.method !== 'GET' || !request.params?.productId) {
      return undefined;
    }

    const query = request.query || {};
    const limit = clampQueryInt(
      query.limit,
      BY_PRODUCT_MAX_LIMIT,
      1,
      BY_PRODUCT_MAX_LIMIT,
    );
    const minSimilarity = clampQueryInt(query.minSimilarity, 25, 0, 100);

    return getVisualSearchByProductCacheKey(
      request.params.productId,
      limit,
      minSimilarity,
    );
  }
}
