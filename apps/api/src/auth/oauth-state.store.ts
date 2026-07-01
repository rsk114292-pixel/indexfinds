import * as crypto from 'crypto';
import type { Request } from 'express';
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';
import { OAUTH_STATE_TTL } from './auth.constants';

type StateStoreStoreCallback = (err: Error | null, state: any) => void;
type StateStoreVerifyCallback = (
  err: Error | null,
  ok: boolean,
  state: any,
) => void;

/**
 * Redis-based OAuth state store for CSRF protection.
 *
 * Replaces the default session-based state store used by passport-oauth2.
 * Each state token is stored in Redis with a 10-minute TTL and consumed on verification.
 *
 * Implements the passport-oauth2 StateStore interface:
 *   store(req, callback)  — generate + persist a random state
 *   verify(req, providedState, callback) — validate + consume the state
 */
export class RedisOAuthStateStore {
  private readonly logger = new Logger(RedisOAuthStateStore.name);

  constructor(private readonly redis: Redis) {}

  private getKey(state: string): string {
    return `oauth:state:${state}`;
  }

  /**
   * Generate a random state token and store it in Redis.
   */
  store(req: Request, callback: StateStoreStoreCallback): void;
  store(req: Request, meta: any, callback: StateStoreStoreCallback): void;
  store(
    _req: Request,
    metaOrCallback: any,
    maybeCallback?: StateStoreStoreCallback,
  ): void {
    const callback = maybeCallback ?? metaOrCallback;
    const state = crypto.randomBytes(32).toString('hex');

    this.redis
      .setex(this.getKey(state), OAUTH_STATE_TTL, '1')
      .then(() => callback(null, state))
      .catch((err: Error) => callback(err, null));
  }

  /**
   * Verify the state returned by the OAuth provider.
   * Uses GETDEL for atomic one-time consumption.
   */
  verify(req: Request, state: string, callback: StateStoreVerifyCallback): void;
  verify(
    req: Request,
    state: string,
    meta: any,
    callback: StateStoreVerifyCallback,
  ): void;
  verify(
    _req: Request,
    providedState: string,
    metaOrCallback: any,
    maybeCallback?: StateStoreVerifyCallback,
  ): void {
    const callback = maybeCallback ?? metaOrCallback;

    if (!providedState) {
      callback(null, false, providedState);
      return;
    }

    this.redis
      .getdel(this.getKey(providedState))
      .then((result) => {
        if (result !== '1') {
          this.logger.warn(
            `OAuth state verification failed: state=${providedState.substring(0, 8)}... result=${result}`,
          );
        }
        callback(null, result === '1', providedState);
      })
      .catch((err: Error) => {
        this.logger.error(`OAuth state Redis error: ${err.message}`);
        callback(err, false, providedState);
      });
  }
}
