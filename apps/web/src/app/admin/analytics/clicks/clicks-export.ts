import dayjs from 'dayjs';
import { get } from '@/lib/api';
import type { ClicksData, ExportContext } from './types';
import {
  pageTypeLabels,
  sourceLabels,
  viewportDeviceTypeLabels,
} from './clicks-formatters';

export async function fetchAllClickRecords(
  params: ExportContext,
): Promise<ClicksData['records']> {
  const limit = 500;
  const endOfDay = params.dateRange[1].endOf('day');
  const firstPage = await get<ClicksData>('/admin/analytics/clicks', {
    startDate: params.dateRange[0].toISOString(),
    endDate: endOfDay.toISOString(),
    source: params.source || undefined,
    platform: params.platform || undefined,
    productKeyword: params.productKeyword || undefined,
    scope: params.scope,
    page: 1,
    limit,
  });

  const totalPages = Math.max(
    Math.ceil((firstPage.pagination?.total || 0) / limit),
    1,
  );
  const allRecords = [...(firstPage.records || [])];

  for (let page = 2; page <= totalPages; page += 1) {
    const pageData = await get<ClicksData>('/admin/analytics/clicks', {
      startDate: params.dateRange[0].toISOString(),
      endDate: endOfDay.toISOString(),
      source: params.source || undefined,
      platform: params.platform || undefined,
      productKeyword: params.productKeyword || undefined,
      scope: params.scope,
      page,
      limit,
    });
    allRecords.push(...(pageData.records || []));
  }

  return allRecords;
}

export function buildClicksCsv(
  data: ClicksData,
  filters: ExportContext,
  rowsData: ClicksData['records'],
): string {
  const headers = [
    '商品名称',
    '商品ID',
    '来源',
    '页面类型',
    '平台',
    '搜索词',
    '按钮位',
    '语言',
    '视口',
    '时间',
  ];

  const rows = rowsData.map((click) => [
    click.productName.replace(/,/g, '，'),
    click.productId,
    sourceLabels[click.source] || click.source,
    click.pageType ? pageTypeLabels[click.pageType] || click.pageType : '',
    click.platform,
    (click.query || '').replace(/,/g, '，'),
    click.buttonVariant || '',
    click.locale || '',
    click.viewportDeviceType
      ? viewportDeviceTypeLabels[click.viewportDeviceType] ||
        click.viewportDeviceType
      : '',
    dayjs(click.createdAt).add(8, 'hour').format('YYYY-MM-DD HH:mm:ss'),
  ]);

  const summary = [
    [],
    ['=== 汇总信息 ==='],
    [
      '统计周期',
      `${filters.dateRange[0].format('YYYY-MM-DD')} 至 ${filters.dateRange[1].format('YYYY-MM-DD')}`,
    ],
    ['购买意图', data.summary.productIntentTotal],
    ['平台选择', data.summary.platformSelectionTotal],
    ['平台选择/购买意图', `${data.summary.platformSelectionRate}%`],
    ['多平台比较意图', data.summary.multiPlatformIntentCount],
    ['多平台比较率', `${data.summary.multiPlatformIntentRate}%`],
    ['原始外跳事件', data.summary.rawTotal],
    ['重复/过滤事件', data.summary.suspiciousClicks],
    ['重复/过滤占比', `${data.summary.suspiciousRate}%`],
    ['外跳商品数', data.summary.uniqueProducts],
    ['筛选来源', filters.source || '全部'],
    ['筛选平台', filters.platform || '全部'],
    ['商品关键词', filters.productKeyword || '全部'],
    [
      '统计口径',
      filters.scope === 'raw' ? '原始口径（包含内部/管理员）' : '顾客口径（排除内部/管理员）',
    ],
    [],
    ['=== 来源分布 ==='],
    ...Object.entries(data.bySource).map(([source, count]) => [
      sourceLabels[source] || source,
      count,
    ]),
    [],
    ['=== 平台选择分布 ==='],
    ...Object.entries(data.byPlatform).map(([platform, count]) => [
      platform,
      count,
    ]),
    [],
    ['=== 页面类型分布 ==='],
    ...Object.entries(data.byPageType || {}).map(([pageType, count]) => [
      pageTypeLabels[pageType] || pageType,
      count,
    ]),
    [],
    ['=== 视口分布 ==='],
    ...Object.entries(data.byViewportDeviceType || {}).map(
      ([viewportDeviceType, count]) => [
        viewportDeviceTypeLabels[viewportDeviceType] || viewportDeviceType,
        count,
      ],
    ),
  ];

  return [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
    ...summary.map((row) => row.join(',')),
  ].join('\n');
}

function downloadCsv(filename: string, content: string) {
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], {
    type: 'text/csv;charset=utf-8;',
  });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportClicksToCsv(
  data: ClicksData | null,
  filters: ExportContext,
  messageApi: {
    success: (msg: string) => void;
    warning: (msg: string) => void;
    error: (msg: string) => void;
  },
) {
  if (!data || data.pagination.total === 0) {
    messageApi.warning('没有数据可导出');
    return;
  }

  const rowsData = await fetchAllClickRecords(filters);
  const csvContent = buildClicksCsv(data, filters, rowsData);
  downloadCsv(
    `外跳统计_${filters.dateRange[0].format('YYYYMMDD')}_${filters.dateRange[1].format('YYYYMMDD')}.csv`,
    csvContent,
  );
  messageApi.success('导出成功');
}
