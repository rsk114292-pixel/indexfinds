import { buildRobots } from './robots';
import { getSiteUrl } from '@/lib/site-config';

describe('robots.txt', () => {
  const mainSiteUrl = getSiteUrl();
  const rules = buildRobots(mainSiteUrl).rules as Array<{
    userAgent: string;
    allow?: string | string[];
    disallow?: string | string[];
  }>;

  it('包含两组规则（通用 + Googlebot）', () => {
    expect(rules).toHaveLength(2);
  });

  describe('通用爬虫规则（*）', () => {
    it('允许根路径', () => {
      expect(rules[0]).toMatchObject({ userAgent: '*', allow: '/' });
    });

    it('屏蔽分页和排序参数', () => {
      expect(rules[0].disallow).toContain('/*?page=');
      expect(rules[0].disallow).toContain('/*?sort=');
    });

    it('屏蔽用户私有页面', () => {
      expect(rules[0].disallow).toContain('/*/profile/');
      expect(rules[0].disallow).toContain('/*/cart/');
      expect(rules[0].disallow).toContain('/*/checkout/');
      expect(rules[0].disallow).toContain('/*/account/');
      expect(rules[0].disallow).toContain('/*/login');
      expect(rules[0].disallow).toContain('/*/register');
      expect(rules[0].disallow).toContain('/*/forgot-password');
      expect(rules[0].disallow).toContain('/*/reset-password');
      expect(rules[0].disallow).toContain('/*/verify-email');
    });
  });

  describe('Googlebot 规则', () => {
    it('屏蔽分页和排序参数（与通用规则一致）', () => {
      expect(rules[1].disallow).toContain('/*?page=');
      expect(rules[1].disallow).toContain('/*?sort=');
    });

    it('屏蔽 API 和管理后台', () => {
      expect(rules[1].disallow).toContain('/api/');
      expect(rules[1].disallow).toContain('/admin/');
    });
  });

  it('sitemap 指向正确的 URL', () => {
    const result = buildRobots(mainSiteUrl);
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
  });

  it('uses the tenant host for robots and sitemap URLs', () => {
    const result = buildRobots('https://usfansindex.net');

    expect(result.host).toBe('https://usfansindex.net');
    expect(result.sitemap).toBe('https://usfansindex.net/sitemap.xml');
  });

  it('blocks an unreleased tenant without advertising a sitemap', () => {
    const result = buildRobots('https://superbuyindex.com', false);

    expect(result.rules).toEqual({ userAgent: '*', disallow: '/' });
    expect(result.host).toBeUndefined();
    expect(result.sitemap).toBeUndefined();
  });
});
