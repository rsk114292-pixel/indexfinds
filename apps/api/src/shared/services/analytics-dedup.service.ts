import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { LockService } from './lock.service';

export interface AnalyticsDedupClaimInput {
  scope: string;
  windowMs: number;
  parts: Array<string | number | boolean | null | undefined>;
  bucketMs?: number;
  onUnavailable?: 'open' | 'closed';
}

@Injectable()
export class AnalyticsDedupService {
  constructor(private readonly lockService: LockService) {}

  async claim(input: AnalyticsDedupClaimInput): Promise<boolean> {
    const dedupKey = this.buildKey(input);
    return this.lockService.claimOnce(dedupKey, input.windowMs, {
      onUnavailable: input.onUnavailable,
    });
  }

  private buildKey(input: AnalyticsDedupClaimInput): string {
    const bucketMs = input.bucketMs ?? input.windowMs;
    const bucket = Math.floor(Date.now() / bucketMs);
    const normalized = input.parts
      .map((part) => {
        if (part === null || part === undefined) return '(null)';
        return String(part).trim().toLowerCase() || '(empty)';
      })
      .join('|');

    const digest = createHash('sha256')
      .update(`${input.scope}|${bucket}|${normalized}`)
      .digest('hex');

    return `analytics:${input.scope}:${digest}`;
  }
}
