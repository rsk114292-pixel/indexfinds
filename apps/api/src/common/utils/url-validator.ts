import { Logger } from '@nestjs/common';
import * as dns from 'dns';
import * as net from 'net';

const logger = new Logger('UrlValidator');
const SAFE_IMAGE_HOSTS = (
  process.env.SSRF_ALLOWED_IMAGE_HOSTS || 'si.geilicdn.com'
)
  .split(',')
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);

/**
 * 私有/保留 IPv4 CIDR 范围
 * 参考: RFC 1918, RFC 5737, RFC 6598, RFC 3927
 */
const PRIVATE_IPV4_RANGES: Array<{ network: number; mask: number }> = [
  { network: ip4ToInt('127.0.0.0'), mask: 8 }, // Loopback
  { network: ip4ToInt('10.0.0.0'), mask: 8 }, // RFC 1918
  { network: ip4ToInt('172.16.0.0'), mask: 12 }, // RFC 1918
  { network: ip4ToInt('192.168.0.0'), mask: 16 }, // RFC 1918
  { network: ip4ToInt('169.254.0.0'), mask: 16 }, // Link-local
  { network: ip4ToInt('0.0.0.0'), mask: 8 }, // "This" network
  { network: ip4ToInt('100.64.0.0'), mask: 10 }, // RFC 6598 (Carrier-grade NAT)
  { network: ip4ToInt('192.0.0.0'), mask: 24 }, // RFC 6890
  { network: ip4ToInt('192.0.2.0'), mask: 24 }, // RFC 5737 (TEST-NET-1)
  { network: ip4ToInt('198.51.100.0'), mask: 24 }, // RFC 5737 (TEST-NET-2)
  { network: ip4ToInt('203.0.113.0'), mask: 24 }, // RFC 5737 (TEST-NET-3)
  { network: ip4ToInt('224.0.0.0'), mask: 4 }, // Multicast
  { network: ip4ToInt('240.0.0.0'), mask: 4 }, // Reserved
];

function ip4ToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  return (
    ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
  );
}

/**
 * 检查 IPv4 地址是否属于私有/保留范围
 */
function isPrivateIPv4(ip: string): boolean {
  const ipInt = ip4ToInt(ip);
  return PRIVATE_IPV4_RANGES.some(({ network, mask }) => {
    const maskBits = (0xffffffff << (32 - mask)) >>> 0;
    return (ipInt & maskBits) === (network & maskBits);
  });
}

/**
 * 检查 IPv6 地址是否属于私有/保留范围
 */
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === '::1' || // Loopback
    normalized.startsWith('fe80:') || // Link-local
    normalized.startsWith('fc') || // Unique local (fc00::/7)
    normalized.startsWith('fd') || // Unique local (fc00::/7)
    normalized === '::' || // Unspecified
    normalized.startsWith('::ffff:127.') || // IPv4-mapped loopback
    normalized.startsWith('::ffff:10.') || // IPv4-mapped private
    normalized.startsWith('::ffff:192.168.') || // IPv4-mapped private
    normalized.startsWith('::ffff:169.254.') // IPv4-mapped link-local
  );
}

/**
 * 检查 IP 是否为私有/保留地址
 */
function isPrivateIP(ip: string): boolean {
  if (net.isIPv4(ip)) {
    return isPrivateIPv4(ip);
  }
  if (net.isIPv6(ip)) {
    return isPrivateIPv6(ip);
  }
  return true; // 无法识别的格式视为不安全
}

function isAllowlistedHostname(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase();
  return SAFE_IMAGE_HOSTS.some(
    (allowedHost) =>
      normalizedHostname === allowedHost ||
      normalizedHostname.endsWith(`.${allowedHost}`),
  );
}

/**
 * SSRF 安全 URL 校验
 *
 * 按照 OWASP SSRF Prevention Cheat Sheet 实现:
 * 1. 协议白名单 (仅 http/https)
 * 2. DNS 解析后验证 IP 不在私有/保留范围
 * 3. 防止 DNS rebinding（解析后直接返回 IP 供调用方使用）
 *
 * @param url 待校验的 URL
 * @returns 校验通过返回解析后的 IP（可选用于后续请求），失败抛异常
 */
export async function validateUrlForSSRF(url: string): Promise<void> {
  // 1. 基本格式校验 + 协议白名单
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL format: ${url}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `Blocked URL: only http/https protocols allowed, got ${parsed.protocol}`,
    );
  }

  const hostname = parsed.hostname;

  if (!net.isIP(hostname) && isAllowlistedHostname(hostname)) {
    return;
  }

  // 2. 如果 hostname 本身就是 IP，直接检查
  if (net.isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      logger.warn(`SSRF blocked: direct private IP in URL: ${url}`);
      throw new Error('Blocked URL: private/reserved IP address');
    }
    return;
  }

  // 3. DNS 解析 hostname，校验解析结果
  const resolvedIP = await new Promise<string>((resolve, reject) => {
    dns.lookup(hostname, { family: 0 }, (err, address) => {
      if (err) {
        reject(
          new Error(`DNS resolution failed for ${hostname}: ${err.message}`),
        );
        return;
      }
      resolve(address);
    });
  });

  if (isPrivateIP(resolvedIP)) {
    logger.warn(
      `SSRF blocked: ${hostname} resolved to private IP ${resolvedIP}, URL: ${url}`,
    );
    throw new Error(
      'Blocked URL: hostname resolves to private/reserved IP address',
    );
  }
}
