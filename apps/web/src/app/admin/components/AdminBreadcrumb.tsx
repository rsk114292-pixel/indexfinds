'use client';

/**
 * Admin 面包屑导航
 * 根据当前路由自动生成，使用 route-config 中的标签映射
 */
import { Breadcrumb } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { breadcrumbLabelMap } from '../route-config';

export default function AdminBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean); // ['admin', 'products', 'import']

  // 不在 dashboard 显示面包屑（它是首页）
  if (pathname === '/admin/dashboard' || pathname === '/admin') {
    return null;
  }

  const items = [
    {
      title: (
        <Link href="/admin/dashboard">
          <HomeOutlined />
        </Link>
      ),
    },
  ];

  let currentPath = '';
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    // 跳过 'admin' 本身
    if (segment === 'admin') continue;

    const label = breadcrumbLabelMap[segment];
    const isLast = i === segments.length - 1;

    if (!label) {
      // 动态段（如 [id]、[itemId]）：显示为 "详情"
      items.push({ title: <span>详情</span> });
      continue;
    }

    if (isLast) {
      items.push({ title: <span>{label}</span> });
    } else {
      items.push({
        title: <Link href={currentPath}>{label}</Link>,
      });
    }
  }

  return <Breadcrumb items={items} className="mb-4" />;
}
