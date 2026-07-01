'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Menu } from 'antd';
import {
  ShopOutlined,
  RobotOutlined,
  ClearOutlined,
  DollarOutlined,
  LinkOutlined,
  BarChartOutlined,
  SearchOutlined,
} from '@ant-design/icons';

const menuItems = [
  { key: '/admin/settings/platforms', icon: <ShopOutlined />, label: '平台配置' },
  { key: '/admin/settings/ai', icon: <RobotOutlined />, label: 'AI 配置' },
  { key: '/admin/settings/search-engine', icon: <SearchOutlined />, label: '搜索引擎' },
  { key: '/admin/settings/tracking', icon: <BarChartOutlined />, label: '追踪与分析' },
  { key: '/admin/settings/cache', icon: <ClearOutlined />, label: '缓存管理' },
  { key: '/admin/settings/general', icon: <DollarOutlined />, label: '汇率配置' },
  { key: '/admin/settings/social-links', icon: <LinkOutlined />, label: '社交链接' },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const selectedKey =
    menuItems.find((item) => pathname.startsWith(item.key))?.key ||
    '/admin/settings/general';

  return (
    <div className="flex gap-6">
      <div className="w-48 flex-shrink-0">
        <div className="text-lg font-bold mb-4">系统配置</div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={(e) => router.push(e.key)}
          style={{ border: 'none', background: 'transparent' }}
        />
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
