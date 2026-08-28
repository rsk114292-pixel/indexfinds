/**
 * Robots.txt 动态生成
 * 控制搜索引擎爬虫行为
 */
import { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import {
  isTenantReleasedForIndexing,
  resolveSiteIdentityFromHeaders,
} from '@/lib/tenant-config';

const PRIVATE_PATHS = [
  '/api/',           // API 端点
  '/admin/',         // 管理后台
  '/*/profile/',     // 所有语言的用户个人页
  '/*/cart/',        // 所有语言的购物车
  '/*/checkout/',    // 所有语言的结账流程
  '/*/account/',     // 所有语言的账户页面
  '/*/login',        // 所有语言的登录页
  '/*/register',     // 所有语言的注册页
  '/*/forgot-password',
  '/*/reset-password',
  '/*/verify-email',
  '/r/',             // 推荐链接追踪
  '/*?sort=',        // 排序参数页面
  '/*?page=',        // 深度分页
] as const;

export function buildRobots(
  siteUrl: string,
  allowIndexing = true,
): MetadataRoute.Robots {
  if (!allowIndexing) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [...PRIVATE_PATHS],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [...PRIVATE_PATHS],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const identity = resolveSiteIdentityFromHeaders(
    await headers(),
    process.env.INDEXFINDS_LOCAL_TENANT_HOST,
  );
  const allowIndexing =
    !identity.tenant || isTenantReleasedForIndexing(identity.tenant);

  return buildRobots(identity.siteUrl, allowIndexing);
}
