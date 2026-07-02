'use client';

/**
 * Admin 路由配置表
 * 驱动侧边栏菜单 + 面包屑 + selectedKeys/openKeys
 */
import {
  DashboardOutlined,
  ShoppingOutlined,
  AppstoreOutlined,
  TagsOutlined,
  FilterOutlined,
  SettingOutlined,
  ImportOutlined,
  BarChartOutlined,
  ShopOutlined,
  SearchOutlined,
  WalletOutlined,
  LinkOutlined,
  DatabaseOutlined,
  HistoryOutlined,
  SafetyOutlined,
  FileTextOutlined,
  RobotOutlined,
  ClearOutlined,
  TeamOutlined,
  FireOutlined,
  ExperimentOutlined,
  StopOutlined,
} from '@ant-design/icons';

// ── 侧边栏菜单配置 ──
export const adminMenuItems = [
  {
    key: '/admin/dashboard',
    icon: <DashboardOutlined />,
    label: '仪表盘',
  },
  {
    key: 'products',
    icon: <ShoppingOutlined />,
    label: '产品管理',
    children: [
      { key: '/admin/products', label: '产品列表' },
      { key: '/admin/products/hot', label: '热门管理', icon: <FireOutlined /> },
      { key: '/admin/products/requests', label: '找货需求', icon: <FileTextOutlined /> },
      { key: '/admin/products/import', label: '批量导入', icon: <ImportOutlined /> },
      { key: '/admin/products/sku-split', label: 'SKU 拆分', icon: <ExperimentOutlined /> },
      { key: '/admin/products/split-history', label: '拆分历史', icon: <HistoryOutlined /> },
    ],
  },
  {
    key: '/admin/categories',
    icon: <AppstoreOutlined />,
    label: '分类管理',
  },
  {
    key: '/admin/brands',
    icon: <TagsOutlined />,
    label: '品牌管理',
  },
  {
    key: '/admin/attributes',
    icon: <FilterOutlined />,
    label: '筛选属性',
  },
  {
    key: '/admin/users',
    icon: <TeamOutlined />,
    label: '用户管理',
  },
  {
    key: '/admin/withdrawals',
    icon: <WalletOutlined />,
    label: '提现管理',
  },
  {
    key: 'analytics',
    icon: <BarChartOutlined />,
    label: '数据分析',
    children: [
      { key: '/admin/analytics/search', label: '搜索分析', icon: <SearchOutlined /> },
      { key: '/admin/analytics/clicks', label: '点击追踪', icon: <LinkOutlined /> },
      { key: '/admin/analytics/traffic', label: '流量来源', icon: <BarChartOutlined /> },
      { key: '/admin/analytics/traffic-defense', label: '流量防御', icon: <StopOutlined /> },
      { key: '/admin/analytics/referrals', label: '推荐码分析', icon: <LinkOutlined /> },
      { key: '/admin/analytics/vectors', label: '向量管理', icon: <DatabaseOutlined /> },
      { key: '/admin/analytics/hot-searches', label: '热搜管理', icon: <FireOutlined /> },
      { key: '/admin/analytics/hot-searches/experiments', label: 'A/B 实验', icon: <ExperimentOutlined /> },
    ],
  },
  {
    key: 'settings',
    icon: <SettingOutlined />,
    label: '系统配置',
    children: [
      { key: '/admin/settings/platforms', label: '平台配置', icon: <ShopOutlined /> },
      { key: '/admin/settings/ai', label: 'AI 配置', icon: <RobotOutlined /> },
      { key: '/admin/settings/tracking', label: '追踪与分析', icon: <BarChartOutlined /> },
      { key: '/admin/settings/cache', label: '缓存管理', icon: <ClearOutlined /> },
      { key: '/admin/settings/general', label: '汇率配置', icon: <SettingOutlined /> },
      { key: '/admin/settings/social-links', label: '社交链接', icon: <LinkOutlined /> },
    ],
  },
  {
    key: 'account',
    icon: <SafetyOutlined />,
    label: '安全与账户',
    children: [
      { key: '/admin/account/login-logs', label: '登录日志', icon: <FileTextOutlined /> },
      { key: '/admin/account/password', label: '修改密码', icon: <SafetyOutlined /> },
    ],
  },
];

// ── 面包屑标签映射（路径段 → 中文标签）──
export const breadcrumbLabelMap: Record<string, string> = {
  admin: '管理后台',
  dashboard: '仪表盘',
  products: '产品管理',
  import: '批量导入',
  review: '普通上传待审核',
  mixed: '混合产品',
  split: '拆分工具',
  hot: '热门管理',
  requests: '找货需求',
  'sku-split': 'SKU 拆分',
  new: '新建拆分',
  batch: '批量拆分',
  'split-history': '拆分历史',
  categories: '分类管理',
  brands: '品牌管理',
  attributes: '筛选属性',
  users: '用户管理',
  withdrawals: '提现管理',
  analytics: '数据分析',
  search: '搜索分析',
  clicks: '点击追踪',
  traffic: '流量来源',
  'traffic-defense': '流量防御',
  referrals: '推荐码分析',
  vectors: '向量管理',
  'hot-searches': '热搜管理',
  experiments: 'A/B 实验',
  settings: '系统配置',
  platforms: '平台配置',
  ai: 'AI 配置',
  cache: '缓存管理',
  'visual-search': '以图搜图',
  general: '汇率配置',
  'social-links': '社交链接',
  tracking: '追踪与分析',
  account: '安全与账户',
  'login-logs': '登录日志',
  password: '修改密码',
};

// ── 菜单选中/展开键计算 ──

/** 根据 pathname 计算侧边栏选中项 */
export function getSelectedKeys(pathname: string): string[] {
  // 按最长前缀匹配：收集所有叶子路由 key，找最长匹配
  const leafKeys: string[] = [];
  for (const item of adminMenuItems) {
    if (item.children) {
      for (const child of item.children) {
        leafKeys.push(child.key);
      }
    } else {
      leafKeys.push(item.key);
    }
  }
  // 按长度降序排列，优先匹配更具体的路由
  leafKeys.sort((a, b) => b.length - a.length);

  for (const key of leafKeys) {
    if (pathname === key || pathname.startsWith(key + '/')) {
      return [key];
    }
  }
  // fallback: settings 根路径
  if (pathname.startsWith('/admin/settings')) return ['/admin/settings/general'];
  return [pathname];
}

/** 根据 pathname 计算应展开的菜单组 */
export function getOpenKeys(pathname: string): string[] {
  if (pathname.startsWith('/admin/products')) return ['products'];
  if (pathname.startsWith('/admin/analytics')) return ['analytics'];
  if (pathname.startsWith('/admin/settings')) return ['settings'];
  if (pathname.startsWith('/admin/account')) return ['account'];
  return [];
}
