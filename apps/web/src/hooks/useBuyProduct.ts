import { useState, useCallback } from 'react';
import { get } from '@/lib/api';
import { useCookieConsent } from '@/components/CookieConsent';
import {
  detectLocaleFromPath,
  detectOutboundViewportDeviceType,
  detectOutboundPageType,
  markOutbound,
  getSearchClickId,
  getSearchClickQuery,
  clearSearchClickId,
  recordOutboundClick,
  getPageSource,
} from '@/lib/search-tracking';
import { trackGA4Event } from '@/lib/ga-events';
import { getCurrentTrackingIdentity } from '@/lib/search-tracking';
import {
  ensureVisitSessionRecorded,
  flushVisitEngagement,
} from '@/lib/visit-tracking';

interface BuyLinkResponse {
  url: string;
  platform: string;
  platformName: string;
  weidianItemId: string;
  productId: string;
  productTitle: string;
}

interface UseBuyProductOptions {
  productId: string;
  buttonVariant?: string;
  onError?: (error: unknown) => void;
  onSuccess?: () => void;
}

/**
 * 商品购买流程 Hook
 *
 * 封装完整的购买链路：获取购买链接 → 记录分析事件 → 跳转外链
 * 由 MobileBuyBar 和 MobileProductDetail (PlatformSelectModal) 共享使用
 */
export function useBuyProduct({
  productId,
  buttonVariant,
  onError,
  onSuccess,
}: UseBuyProductOptions) {
  const [loading, setLoading] = useState(false);
  const { consent } = useCookieConsent();

  const buyWithPlatform = useCallback(
    async (platformKey: string) => {
      // Open synchronously in the click handler so mobile browsers do not block it.
      const newWindow = window.open('about:blank', '_blank');
      if (newWindow) newWindow.opener = null;

      setLoading(true);
      try {
        const buyLink = await get<BuyLinkResponse>(
          `/products/${productId}/buy-link?platform=${encodeURIComponent(platformKey)}`,
        );

        const { deviceId, visitId } = getCurrentTrackingIdentity();
        const pagePath =
          typeof window !== 'undefined'
            ? `${window.location.pathname}${window.location.search}`
            : '';
        const pathname =
          typeof window !== 'undefined' ? window.location.pathname : '';

        const pageSource = getPageSource();
        const searchClickId = getSearchClickId(productId);

        await ensureVisitSessionRecorded(consent, 600);
        flushVisitEngagement('outbound');

        recordOutboundClick({
          productId,
          platformType: buyLink.platform,
          platformUrl: buyLink.url,
          source: pageSource,
          searchClickId: searchClickId || undefined,
          pageType: detectOutboundPageType(pathname),
          pagePath: pagePath || undefined,
          query: getSearchClickQuery(productId) || undefined,
          buttonVariant,
          locale: detectLocaleFromPath(pathname) || undefined,
          viewportDeviceType: detectOutboundViewportDeviceType(),
          sessionId: deviceId,
          deviceId,
          visitId,
        }).catch(() => {});

        if (searchClickId) {
          markOutbound(searchClickId).catch(() => {});
          clearSearchClickId(productId);
        }

        trackGA4Event('outbound_click', {
          product_id: productId,
          platform: buyLink.platform,
          platform_name: buyLink.platformName,
          source: pageSource,
        });

        if (newWindow) {
          newWindow.location.href = buyLink.url;
        } else {
          window.location.href = buyLink.url;
        }
        onSuccess?.();
      } catch (error) {
        newWindow?.close();
        onError?.(error);
      } finally {
        setLoading(false);
      }
    },
    [buttonVariant, consent, onSuccess, productId, onError],
  );

  return { buyWithPlatform, loading };
}
