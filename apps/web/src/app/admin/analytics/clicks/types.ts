import type dayjs from 'dayjs';

export type AnalyticsScope = 'customer' | 'raw';

export interface ClicksData {
  summary: {
    total: number;
    rawTotal: number;
    productIntentTotal: number;
    productIntentChange: number;
    prevProductIntentTotal: number;
    platformSelectionTotal: number;
    platformSelectionChange: number;
    prevPlatformSelectionTotal: number;
    platformSelectionRate: number;
    multiPlatformIntentCount: number;
    multiPlatformIntentChange: number;
    prevMultiPlatformIntentCount: number;
    multiPlatformIntentRate: number;
    suspiciousClicks: number;
    suspiciousRate: number;
    totalChange: number;
    uniqueProducts: number;
    uniqueProductsChange: number;
    prevTotal: number;
    prevRawTotal: number;
    prevUniqueProducts: number;
  };
  bySource: Record<string, number>;
  byPlatform: Record<string, number>;
  byPageType: Record<string, number>;
  byLocale: Record<string, number>;
  byViewportDeviceType: Record<string, number>;
  byButtonVariant: Record<string, number>;
  byDate: { date: string; count: number }[];
  prevByDate: { date: string; count: number }[];
  topProducts: {
    productId: string;
    productName: string;
    productImage: string | null;
    count: number;
  }[];
  topQueries: { key: string; count: number }[];
  topPages: { key: string; count: number }[];
  records: {
    id: string;
    productId: string;
    productName: string;
    productImage: string | null;
    platform: string;
    source: string;
    pageType?: string | null;
    pagePath?: string | null;
    query?: string | null;
    buttonVariant?: string | null;
    locale?: string | null;
    viewportDeviceType?: string | null;
    createdAt: string;
  }[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
  filters: {
    source: string | null;
    platform: string | null;
    productKeyword: string | null;
  };
  period: {
    current: { start: string; end: string };
    previous: { start: string; end: string };
  };
}

export type ExportContext = {
  dateRange: [dayjs.Dayjs, dayjs.Dayjs];
  source?: string;
  platform?: string;
  productKeyword?: string;
  scope?: AnalyticsScope;
};

export interface ClicksAnalyticsFilters {
  dateRange: [dayjs.Dayjs, dayjs.Dayjs];
  page: number;
  pageSize: number;
  sourceFilter?: string;
  platformFilter?: string;
  productKeyword: string;
  scope: AnalyticsScope;
}
