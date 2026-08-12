import { ImageResponse } from 'next/og';
import { getSiteName } from '@/lib/site-config';
import { getLocalizedName } from '@/lib/utils';
import { getProductDetailTag } from '@/lib/cache-tags';

export const runtime = 'nodejs';
export const revalidate = 3600;
export const alt = 'Product preview';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4101';
const BRAND_COLOR = '#FF6B47';

// Locale → 默认货币映射
const LOCALE_CURRENCY: Record<string, string> = {
  en: 'USD', zh: 'CNY', fr: 'EUR', de: 'EUR',
  es: 'EUR', it: 'EUR', pt: 'EUR', ar: 'USD',
};

// 近似汇率（与 lib/utils.ts DEFAULT_RATES 一致，CNY 为基准 1）
const RATES: Record<string, number> = {
  CNY: 1, USD: 0.14, EUR: 0.13, GBP: 0.11, CAD: 0.19, AUD: 0.22,
};

function formatOgPrice(amountCNY: number, locale: string): string {
  const currency = LOCALE_CURRENCY[locale] || 'USD';
  const rate = RATES[currency] ?? 0.14;
  const converted = amountCNY * rate;
  const prefix = currency === 'CNY' ? '' : '≈ ';
  const formatted = new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(converted);
  return `${prefix}${formatted}`;
}

async function getProduct(slug: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/products/slug/${slug}`, {
      next: { revalidate: 3600, tags: [getProductDetailTag(slug)] },
      signal: AbortSignal.timeout(4500),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function loadImage(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const ct = res.headers.get('content-type') || 'image/jpeg';
    return `data:${ct};base64,${base64}`;
  } catch {
    return null;
  }
}

export default async function OGImage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const product = await getProduct(slug);

  // 产品不存在 → 通用品牌 OG 图
  if (!product) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1a1a2e',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 48, fontWeight: 600, color: '#ffffff' }}>
              {getSiteName()}
            </div>
            <div style={{ fontSize: 20, color: '#94a3b8' }}>
              Discover trending products from China
            </div>
          </div>
        </div>
      ),
      { ...size },
    );
  }

  // 准备数据
  const brandName = product.brand?.name || product.aiBrandName || '';
  const title = product.title?.length > 60
    ? product.title.slice(0, 60) + '...'
    : product.title || '';
  const categoryName = product.primaryCategory
    ? getLocalizedName(product.primaryCategory, locale)
    : '';
  const price = product.priceMin
    ? formatOgPrice(product.priceMin, locale)
    : '';

  // 加载产品主图
  const imageDataUrl = product.mainImage
    ? await loadImage(product.mainImage)
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
        }}
      >
        {/* 主内容区 */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'row',
            padding: '40px 48px 24px',
            gap: 48,
          }}
        >
          {/* 左侧：产品图片 */}
          <div
            style={{
              width: 420,
              height: 420,
              borderRadius: 16,
              backgroundColor: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {imageDataUrl ? (
              <img
                src={imageDataUrl}
                alt=""
                width={420}
                height={420}
                style={{ objectFit: 'contain' }}
              />
            ) : (
              <div style={{ fontSize: 80, color: '#d1d5db', fontWeight: 600 }}>
                {title.charAt(0) || '?'}
              </div>
            )}
          </div>

          {/* 右侧：产品信息 */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 16,
              minWidth: 0,
            }}
          >
            {/* 站点名 */}
            <div style={{ fontSize: 18, color: '#94a3b8', letterSpacing: 1 }}>
              {getSiteName()}
            </div>

            {/* 品牌名 */}
            {brandName && (
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 600,
                  color: BRAND_COLOR,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                {brandName}
              </div>
            )}

            {/* 标题 */}
            <div
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: '#1a1a2e',
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </div>

            {/* 分类标签 */}
            {categoryName && (
              <div style={{ display: 'flex' }}>
                <div
                  style={{
                    fontSize: 16,
                    color: '#7c3aed',
                    backgroundColor: '#f3e8ff',
                    padding: '4px 14px',
                    borderRadius: 20,
                  }}
                >
                  {categoryName}
                </div>
              </div>
            )}

            {/* 价格 */}
            {price && (
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 600,
                  color: BRAND_COLOR,
                  marginTop: 8,
                }}
              >
                {price}
              </div>
            )}
          </div>
        </div>

        {/* 底部渐变条 */}
        <div
          style={{
            height: 8,
            background: 'linear-gradient(to right, #FF6B47, #FFB347)',
            width: '100%',
          }}
        />
      </div>
    ),
    { ...size },
  );
}
