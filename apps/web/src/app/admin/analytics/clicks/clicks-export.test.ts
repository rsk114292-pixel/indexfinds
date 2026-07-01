import dayjs from 'dayjs';
import {
  buildClicksCsv,
  exportClicksToCsv,
  fetchAllClickRecords,
} from './clicks-export';
import type { ClicksData } from './types';

const mockGet = jest.fn();

jest.mock('@/lib/api', () => ({
  get: (...args: unknown[]) => mockGet(...args),
}));

describe('clicks export helpers', () => {
  const filters = {
    dateRange: [dayjs('2026-04-01T00:00:00.000Z'), dayjs('2026-04-03T00:00:00.000Z')] as [
      dayjs.Dayjs,
      dayjs.Dayjs,
    ],
    source: 'search',
    platform: 'superbuy',
    productKeyword: 'nike',
  };

  const data: ClicksData = {
    summary: {
      total: 12,
      rawTotal: 20,
      productIntentTotal: 10,
      productIntentChange: 0,
      prevProductIntentTotal: 0,
      platformSelectionTotal: 12,
      platformSelectionChange: 0,
      prevPlatformSelectionTotal: 0,
      platformSelectionRate: 120,
      multiPlatformIntentCount: 2,
      multiPlatformIntentChange: 0,
      prevMultiPlatformIntentCount: 0,
      multiPlatformIntentRate: 20,
      suspiciousClicks: 8,
      suspiciousRate: 40,
      totalChange: 0,
      uniqueProducts: 4,
      uniqueProductsChange: 0,
      prevTotal: 0,
      prevRawTotal: 0,
      prevUniqueProducts: 0,
    },
    bySource: { search: 12 },
    byPlatform: { superbuy: 12 },
    byPageType: { product: 10 },
    byLocale: {},
    byViewportDeviceType: { mobile: 7 },
    byButtonVariant: {},
    byDate: [],
    prevByDate: [],
    topProducts: [],
    topQueries: [],
    topPages: [],
    records: [
      {
        id: 'r1',
        productId: 'p1',
        productName: 'Nike, Dunk',
        productImage: null,
        platform: 'superbuy',
        source: 'search',
        pageType: 'product',
        query: 'nike,dunk',
        buttonVariant: 'primary',
        locale: 'en',
        viewportDeviceType: 'mobile',
        createdAt: '2026-04-02T00:00:00.000Z',
      },
    ],
    pagination: {
      total: 1,
      page: 1,
      limit: 20,
    },
    filters: {
      source: 'search',
      platform: 'superbuy',
      productKeyword: 'nike',
    },
    period: {
      current: { start: '2026-04-01T00:00:00.000Z', end: '2026-04-03T00:00:00.000Z' },
      previous: { start: '2026-03-29T00:00:00.000Z', end: '2026-03-31T00:00:00.000Z' },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches all pages before export', async () => {
    mockGet
      .mockResolvedValueOnce({
        pagination: { total: 600 },
        records: [{ id: 'r1' }],
      })
      .mockResolvedValueOnce({
        pagination: { total: 600 },
        records: [{ id: 'r2' }],
      });

    const rows = await fetchAllClickRecords(filters);

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(rows).toEqual([{ id: 'r1' }, { id: 'r2' }]);
  });

  it('builds translated csv content with summary blocks', () => {
    const csv = buildClicksCsv(data, filters, data.records);

    expect(csv).toContain('商品名称,商品ID,来源,页面类型,平台,搜索词,按钮位,语言,视口,时间');
    expect(csv).toContain('Nike， Dunk,p1,搜索,商品页,superbuy,nike，dunk,primary,en,移动端');
    expect(csv).toContain('=== 汇总信息 ===');
    expect(csv).toContain('购买意图,10');
    expect(csv).toContain('平台选择,12');
    expect(csv).toContain('筛选来源,search');
  });

  it('warns instead of exporting when there is no data', async () => {
    const messageApi = {
      success: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
    };

    await exportClicksToCsv(
      {
        ...data,
        pagination: { ...data.pagination, total: 0 },
      },
      filters,
      messageApi,
    );

    expect(messageApi.warning).toHaveBeenCalledWith('没有数据可导出');
    expect(messageApi.success).not.toHaveBeenCalled();
    expect(mockGet).not.toHaveBeenCalled();
  });
});
