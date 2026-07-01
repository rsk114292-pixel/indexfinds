/**
 * 微店爬虫相关事件定义
 */

export const WeidianEvents = {
  // 抓取请求事件
  SCRAPE_REQUEST: 'weidian.scrape.request',
  SCRAPE_RESPONSE: 'weidian.scrape.response',
  SCRAPE_FAILED: 'weidian.scrape.failed',

  // 提取 ID 事件
  EXTRACT_ID_REQUEST: 'weidian.extract_id.request',
  EXTRACT_ID_RESPONSE: 'weidian.extract_id.response',
} as const;

// ===== 事件载荷类型 =====

export interface WeidianScrapeRequestEvent {
  requestId: string;
  itemId: string;
  wdtoken?: string;
  forceRefresh?: boolean;
}

export interface WeidianScrapeResponseEvent {
  requestId: string;
  success: boolean;
  data?: WeidianScrapedData;
  error?: string;
}

export interface WeidianScrapedData {
  itemId: string;
  title: string;
  price: number;
  images: string[];
  description?: string;
  skus?: Array<{
    skuId: string;
    title: string;
    price: number;
    stock: number;
    imageUrl?: string;
  }>;
  shopInfo?: {
    shopId: string;
    shopName: string;
  };
  rawData?: Record<string, unknown>;
}

export interface WeidianExtractIdRequestEvent {
  requestId: string;
  url: string;
}

export interface WeidianExtractIdResponseEvent {
  requestId: string;
  itemId: string | null;
}
