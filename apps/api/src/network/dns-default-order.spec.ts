import { setDefaultResultOrder } from 'node:dns';
import {
  applyDnsResultOrder,
  resolveDnsResultOrder,
} from './dns-default-order';

jest.mock('node:dns', () => ({
  setDefaultResultOrder: jest.fn(),
}));

describe('dns-default-order', () => {
  const logger = {
    log: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveDnsResultOrder', () => {
    it('defaults to ipv4first in production', () => {
      expect(resolveDnsResultOrder({ NODE_ENV: 'production' })).toBe(
        'ipv4first',
      );
    });

    it('uses verbatim outside production by default', () => {
      expect(resolveDnsResultOrder({ NODE_ENV: 'development' })).toBe(
        'verbatim',
      );
    });

    it('honors a valid override', () => {
      expect(
        resolveDnsResultOrder({
          NODE_ENV: 'production',
          API_DNS_RESULT_ORDER: 'ipv6first',
        }),
      ).toBe('ipv6first');
    });
  });

  describe('applyDnsResultOrder', () => {
    it('applies the resolved order and logs it', () => {
      const order = applyDnsResultOrder({ NODE_ENV: 'production' }, logger);

      expect(order).toBe('ipv4first');
      expect(setDefaultResultOrder).toHaveBeenCalledWith('ipv4first');
      expect(logger.log).toHaveBeenCalledWith(
        '[network] DNS result order set to ipv4first',
      );
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('warns and falls back when override is invalid', () => {
      const order = applyDnsResultOrder(
        {
          NODE_ENV: 'production',
          API_DNS_RESULT_ORDER: 'not-a-valid-order',
        },
        logger,
      );

      expect(order).toBe('ipv4first');
      expect(setDefaultResultOrder).toHaveBeenCalledWith('ipv4first');
      expect(logger.warn).toHaveBeenCalledWith(
        '[network] Ignoring invalid API_DNS_RESULT_ORDER="not-a-valid-order", falling back to environment default',
      );
    });
  });
});
