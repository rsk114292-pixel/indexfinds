export interface SearchContext {
  userId?: string;
  sessionId?: string;
  deviceId?: string;
  visitId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SearchLogResult {
  searchLogId: string;
}

export interface ImpressionItem {
  productId: string;
  position: number;
}

export interface ProductCTR {
  productId: string;
  impressions: number;
  clicks: number;
  ctr: number;
  avgPosition: number;
  adjustedCtr: number;
}

export interface RecordClickParams {
  searchLogId: string;
  query: string;
  productId: string;
  position: number;
  page?: number;
  userId?: string;
  sessionId?: string;
  deviceId?: string;
  visitId?: string;
}

export interface SearchAnalyticsOverview {
  totalSearches: number;
  zeroResultSearches: number;
  zeroResultRate: number;
  totalImpressions: number;
  totalClicks: number;
  ctr: number;
  totalConversions: number;
  conversionRate: number;
}

export interface TopSearchQuery {
  keyword: string;
  searchCount: number;
  avgResultCount: number;
  clicks: number;
  ctr: number;
}

export interface ZeroResultQuery {
  keyword: string;
  searchCount: number;
  lastSearchedAt: Date;
}

export interface LowCTRQuery {
  keyword: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface ProductCTRRanking {
  productId: string;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  conversionRate: number;
}

export interface SearchTrendItem {
  period: string;
  searches: number;
  zeroResults: number;
  clicks: number;
}
