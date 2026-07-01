import { validateUrlForSSRF } from './url-validator';
import * as dns from 'dns';

// Mock dns.lookup to control resolved IPs in tests
jest.mock('dns');
const mockedDns = dns as jest.Mocked<typeof dns>;

describe('validateUrlForSSRF', () => {
  function mockDnsLookup(ip: string) {
    (mockedDns.lookup as unknown as jest.Mock).mockImplementation(
      (_hostname: string, _opts: any, cb: (...args: any[]) => void) => {
        cb(null, ip);
      },
    );
  }

  function mockDnsLookupError(message: string) {
    (mockedDns.lookup as unknown as jest.Mock).mockImplementation(
      (_hostname: string, _opts: any, cb: (...args: any[]) => void) => {
        cb(new Error(message));
      },
    );
  }

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ============================================================
  // 协议校验
  // ============================================================
  describe('协议校验', () => {
    it('应允许 http 协议', async () => {
      mockDnsLookup('93.184.216.34'); // example.com public IP
      await expect(
        validateUrlForSSRF('http://example.com/image.jpg'),
      ).resolves.toBeUndefined();
    });

    it('应允许 https 协议', async () => {
      mockDnsLookup('93.184.216.34');
      await expect(
        validateUrlForSSRF('https://example.com/image.jpg'),
      ).resolves.toBeUndefined();
    });

    it('应拒绝 ftp 协议', async () => {
      await expect(
        validateUrlForSSRF('ftp://example.com/file'),
      ).rejects.toThrow('only http/https protocols allowed');
    });

    it('应拒绝 file 协议', async () => {
      await expect(validateUrlForSSRF('file:///etc/passwd')).rejects.toThrow(
        'only http/https protocols allowed',
      );
    });

    it('应拒绝 javascript 协议', async () => {
      await expect(validateUrlForSSRF('javascript:alert(1)')).rejects.toThrow();
    });

    it('应拒绝无效 URL 格式', async () => {
      await expect(validateUrlForSSRF('not-a-url')).rejects.toThrow(
        'Invalid URL format',
      );
    });
  });

  // ============================================================
  // 直接 IP 地址校验
  // ============================================================
  describe('直接 IP 地址校验', () => {
    it('应拒绝 127.0.0.1 (loopback)', async () => {
      await expect(validateUrlForSSRF('http://127.0.0.1/path')).rejects.toThrow(
        'private/reserved IP',
      );
    });

    it('应拒绝 127.0.0.2 (loopback 范围)', async () => {
      await expect(validateUrlForSSRF('http://127.0.0.2/path')).rejects.toThrow(
        'private/reserved IP',
      );
    });

    it('应拒绝 10.0.0.1 (RFC 1918)', async () => {
      await expect(validateUrlForSSRF('http://10.0.0.1/path')).rejects.toThrow(
        'private/reserved IP',
      );
    });

    it('应拒绝 172.16.0.1 (RFC 1918)', async () => {
      await expect(
        validateUrlForSSRF('http://172.16.0.1/path'),
      ).rejects.toThrow('private/reserved IP');
    });

    it('应拒绝 192.168.1.1 (RFC 1918)', async () => {
      await expect(
        validateUrlForSSRF('http://192.168.1.1/path'),
      ).rejects.toThrow('private/reserved IP');
    });

    it('应拒绝 169.254.169.254 (AWS metadata)', async () => {
      await expect(
        validateUrlForSSRF('http://169.254.169.254/latest/meta-data/'),
      ).rejects.toThrow('private/reserved IP');
    });

    it('应拒绝 0.0.0.0', async () => {
      await expect(validateUrlForSSRF('http://0.0.0.0/path')).rejects.toThrow(
        'private/reserved IP',
      );
    });

    it('应允许公网 IP', async () => {
      await expect(
        validateUrlForSSRF('http://93.184.216.34/image.jpg'),
      ).resolves.toBeUndefined();
    });
  });

  // ============================================================
  // DNS 解析后的 IP 校验（防 DNS rebinding）
  // ============================================================
  describe('DNS 解析后校验', () => {
    it('域名解析到公网 IP 时应通过', async () => {
      mockDnsLookup('93.184.216.34');
      await expect(
        validateUrlForSSRF('https://example.com/image.jpg'),
      ).resolves.toBeUndefined();
    });

    it('域名解析到 127.0.0.1 时应拒绝', async () => {
      mockDnsLookup('127.0.0.1');
      await expect(
        validateUrlForSSRF('https://evil.com/image.jpg'),
      ).rejects.toThrow('private/reserved IP');
    });

    it('域名解析到 10.x.x.x 时应拒绝', async () => {
      mockDnsLookup('10.0.0.5');
      await expect(
        validateUrlForSSRF('https://evil.com/image.jpg'),
      ).rejects.toThrow('private/reserved IP');
    });

    it('域名解析到 172.16.x.x 时应拒绝', async () => {
      mockDnsLookup('172.16.0.100');
      await expect(
        validateUrlForSSRF('https://evil.com/image.jpg'),
      ).rejects.toThrow('private/reserved IP');
    });

    it('域名解析到 192.168.x.x 时应拒绝', async () => {
      mockDnsLookup('192.168.0.1');
      await expect(
        validateUrlForSSRF('https://evil.com/image.jpg'),
      ).rejects.toThrow('private/reserved IP');
    });

    it('域名解析到 169.254.x.x (link-local) 时应拒绝', async () => {
      mockDnsLookup('169.254.169.254');
      await expect(
        validateUrlForSSRF('https://evil.com/image.jpg'),
      ).rejects.toThrow('private/reserved IP');
    });

    it('域名解析到 100.64.x.x (Carrier-grade NAT) 时应拒绝', async () => {
      mockDnsLookup('100.64.0.1');
      await expect(
        validateUrlForSSRF('https://evil.com/image.jpg'),
      ).rejects.toThrow('private/reserved IP');
    });

    it('DNS 解析失败时应抛出错误', async () => {
      mockDnsLookupError('ENOTFOUND');
      await expect(
        validateUrlForSSRF('https://nonexistent.invalid/image.jpg'),
      ).rejects.toThrow('DNS resolution failed');
    });
  });

  // ============================================================
  // IPv6 地址校验
  // ============================================================
  describe('IPv6 校验', () => {
    it('应拒绝 ::1 (IPv6 loopback) — 通过 DNS 解析路径', async () => {
      // [::1] 在某些 Node 环境中走 DNS 路径，此处 mock DNS 返回 ::1
      mockDnsLookup('::1');
      await expect(validateUrlForSSRF('http://[::1]/path')).rejects.toThrow(
        'private/reserved IP',
      );
    });

    it('域名解析到 IPv6 loopback 时应拒绝', async () => {
      mockDnsLookup('::1');
      await expect(
        validateUrlForSSRF('https://evil.com/image.jpg'),
      ).rejects.toThrow('private/reserved IP');
    });

    it('域名解析到 IPv6 link-local 时应拒绝', async () => {
      mockDnsLookup('fe80::1');
      await expect(
        validateUrlForSSRF('https://evil.com/image.jpg'),
      ).rejects.toThrow('private/reserved IP');
    });
  });

  // ============================================================
  // 边界情况
  // ============================================================
  describe('边界情况', () => {
    it('应拒绝 localhost 域名', async () => {
      mockDnsLookup('127.0.0.1');
      await expect(
        validateUrlForSSRF('http://localhost:8080/path'),
      ).rejects.toThrow('private/reserved IP');
    });

    it('172.15.255.255 应通过（不在 172.16.0.0/12 内）', async () => {
      await expect(
        validateUrlForSSRF('http://172.15.255.255/path'),
      ).resolves.toBeUndefined();
    });

    it('172.32.0.0 应通过（不在 172.16.0.0/12 内）', async () => {
      await expect(
        validateUrlForSSRF('http://172.32.0.0/path'),
      ).resolves.toBeUndefined();
    });

    it('应允许带端口的公网 URL', async () => {
      mockDnsLookup('93.184.216.34');
      await expect(
        validateUrlForSSRF('https://example.com:443/image.jpg'),
      ).resolves.toBeUndefined();
    });

    it('应允许带路径和查询参数的公网 URL', async () => {
      mockDnsLookup('93.184.216.34');
      await expect(
        validateUrlForSSRF('https://cdn.example.com/products/img.jpg?w=800'),
      ).resolves.toBeUndefined();
    });
  });
});
