export const sourceLabels: Record<string, string> = {
  search: '搜索',
  image_search: '图搜',
  category: '分类',
  home: '首页',
  recommendation: '推荐',
  direct: '直接访问',
};

export const pageTypeLabels: Record<string, string> = {
  home: '首页',
  search: '搜索页',
  product: '商品页',
  category: '分类页',
  brand: '品牌页',
  platform_landing: '专题页',
  other: '其他',
};

export const viewportDeviceTypeLabels: Record<string, string> = {
  mobile: '移动端',
  desktop: '桌面端',
  tablet: '平板',
  unknown: '未知',
};

export const platformColors: Record<string, string> = {
  loongbuy: '#1890ff',
  superbuy: '#52c41a',
  wegobuy: '#faad14',
  pandabuy: '#eb2f96',
  sugargoo: '#722ed1',
  cssbuy: '#13c2c2',
};

export function getDistributionItems(
  distribution: Record<string, number>,
  labels?: Record<string, string>,
) {
  const total = Object.values(distribution).reduce((sum, value) => sum + value, 0);
  return Object.entries(distribution)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({
      key,
      label: labels?.[key] || key,
      count: value,
      percent: total > 0 ? Math.round((value / total) * 100) : 0,
    }));
}
