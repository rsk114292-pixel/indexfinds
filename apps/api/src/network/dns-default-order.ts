import { setDefaultResultOrder } from 'node:dns';

export const VALID_DNS_RESULT_ORDERS = [
  'verbatim',
  'ipv4first',
  'ipv6first',
] as const;

export type DnsResultOrder = (typeof VALID_DNS_RESULT_ORDERS)[number];

export interface DnsOrderLogger {
  log: (message: string) => void;
  warn: (message: string) => void;
}

export function resolveDnsResultOrder(env: NodeJS.ProcessEnv): DnsResultOrder {
  const configuredOrder = env.API_DNS_RESULT_ORDER?.trim().toLowerCase();

  if (configuredOrder) {
    if (VALID_DNS_RESULT_ORDERS.includes(configuredOrder as DnsResultOrder)) {
      return configuredOrder as DnsResultOrder;
    }
  }

  if (env.NODE_ENV === 'production') {
    return 'ipv4first';
  }

  return 'verbatim';
}

export function applyDnsResultOrder(
  env: NodeJS.ProcessEnv,
  logger: DnsOrderLogger = console,
): DnsResultOrder {
  const configuredOrder = env.API_DNS_RESULT_ORDER?.trim().toLowerCase();

  if (
    configuredOrder &&
    !VALID_DNS_RESULT_ORDERS.includes(configuredOrder as DnsResultOrder)
  ) {
    logger.warn(
      `[network] Ignoring invalid API_DNS_RESULT_ORDER="${env.API_DNS_RESULT_ORDER}", falling back to environment default`,
    );
  }

  const order = resolveDnsResultOrder(env);
  setDefaultResultOrder(order);
  logger.log(`[network] DNS result order set to ${order}`);
  return order;
}
