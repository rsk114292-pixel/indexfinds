/**
 * 图片工具函数
 * 微店 CDN 动态缩略图（si.geilicdn.com / 腾讯云万象 CI）
 *
 * WebP 支持：通过 imageView2 API 自动转换格式，体积减少约 66%
 * 降级方案：NEXT_PUBLIC_CDN_WEBP=false 时回退到 ?w=&h=（JPEG）
 */

/** CDN WebP 转换是否启用（默认启用，检测脚本可设为 false） */
export function isCdnWebpEnabled(): boolean {
  return process.env.NEXT_PUBLIC_CDN_WEBP !== 'false';
}

/**
 * geilicdn 对部分非白名单 Referer 会返回 403。
 * 对这类图片显式关闭 Referer，避免本地 / perf 环境被防盗链误伤。
 */
export function getImageReferrerPolicy(url: string): 'no-referrer' | undefined {
  if (!url) return undefined;
  return url.includes('geilicdn.com') ? 'no-referrer' : undefined;
}

/**
 * 获取指定尺寸变体 URL
 * 微店 CDN → imageView2 WebP（或降级 ?w=&h=）
 * 其他 → 原 URL
 */
export function getImageVariant(url: string, size: number): string {
  if (!url) return url;
  if (url.includes('geilicdn.com')) {
    const clean = stripCdnParams(url);
    return buildCdnUrl(clean, size);
  }
  return url;
}

/**
 * 还原为原图 URL（去掉所有 CDN 处理参数）
 */
export function getFullResolutionUrl(url: string): string {
  if (!url) return url;
  if (url.includes('geilicdn.com')) {
    return stripCdnParams(url);
  }
  return url;
}

/** 构建 CDN URL：WebP 模式用 imageView2，降级模式用 ?w=&h= */
function buildCdnUrl(baseUrl: string, size: number): string {
  if (isCdnWebpEnabled()) {
    return `${baseUrl}?imageView2/2/w/${size}/h/${size}/format/webp`;
  }
  return `${baseUrl}?w=${size}&h=${size}`;
}

/** 去掉 URL 中的 CDN 处理参数（兼容 ?w=&h= 和 imageView2 两种格式） */
function stripCdnParams(url: string): string {
  try {
    const u = new URL(url);
    // imageView2 格式：整个 search 都是处理参数
    if (u.search.includes('imageView2')) {
      return `${u.origin}${u.pathname}`;
    }
    // 旧格式：?w=&h= 查询参数
    u.searchParams.delete('w');
    u.searchParams.delete('h');
    return u.searchParams.toString() ? u.toString() : `${u.origin}${u.pathname}`;
  } catch {
    return url;
  }
}

/**
 * 管理后台列表缩略图（80×80）
 */
export function getProductListThumbnail(url: string): string {
  return getImageVariant(url, 80);
}

/**
 * 商品卡片缩略图（300×300）
 */
export function getProductCardThumbnail(url: string): string {
  return getImageVariant(url, 300);
}

/**
 * 产品详情页主图（600×600）
 */
export function getProductDetailMainImage(url: string): string {
  return getImageVariant(url, 600);
}

/**
 * 产品详情页缩略图导航（80×80）
 */
export function getProductDetailThumbnail(url: string): string {
  return getImageVariant(url, 80);
}

/**
 * 向后兼容：映射到最近的变体
 */
export function getThumbnailUrl(
  url: string,
  width: number,
  height: number
): string {
  const size = Math.max(width, height);
  return getImageVariant(url, size);
}
