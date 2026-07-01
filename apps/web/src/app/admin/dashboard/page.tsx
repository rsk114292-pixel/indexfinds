'use client';

/**
 * Admin Dashboard Page
 * 仪表盘 - 显示统计数据和概览
 */
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Row, Col, Card, Statistic, Table, Button } from 'antd';
import {
  ShoppingOutlined,
  TagsOutlined,
  AppstoreOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ImportOutlined,
  AuditOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { fetcher } from '@/lib/api';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import { DashboardSkeleton } from '../components/PageSkeleton';
import type { DashboardStats } from '@/types';
import { readSessionCache, writeSessionCache } from '@/lib/session-cache';

const DASHBOARD_CACHE_KEY = 'admin:dashboard:stats';
const DASHBOARD_CACHE_TTL_MS = 5 * 60 * 1000;

export default function DashboardPage() {
  const { isReady } = useAdminAuthReady();
  const [cachedStats, setCachedStats] = useState<DashboardStats | null>(null);
  const { data: stats, isLoading: loading } = useSWR<DashboardStats>(
    isReady ? '/admin/dashboard/stats' : null,
    fetcher,
    { dedupingInterval: 30_000, revalidateOnFocus: false },
  );

  useEffect(() => {
    setCachedStats(readSessionCache<DashboardStats>(DASHBOARD_CACHE_KEY, DASHBOARD_CACHE_TTL_MS));
  }, []);

  useEffect(() => {
    if (stats) {
      writeSessionCache(DASHBOARD_CACHE_KEY, stats);
    }
  }, [stats]);

  const displayStats = stats || cachedStats;

  if (loading && !displayStats) {
    return <DashboardSkeleton />;
  }

  const statusMap: Record<string, string> = {
    active: '已上架',
    inactive: '已下架',
    pending_review: '待审核',
    draft: '草稿',
    split: '已拆分',
  };

  const recentProductColumns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <span className={`px-2 py-1 rounded text-xs ${
          status === 'active' ? 'bg-green-100 text-green-800' :
          status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {statusMap[status] || status}
        </span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">仪表盘</h1>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="产品总数"
              value={displayStats?.totalProducts || 0}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="品牌总数"
              value={displayStats?.totalBrands || 0}
              prefix={<TagsOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="分类总数"
              value={displayStats?.totalCategories || 0}
              prefix={<AppstoreOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="用户总数"
              value={displayStats?.totalUsers || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Action Stats */}
      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="待审核"
              value={displayStats?.pendingReviews || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="今日导入"
              value={displayStats?.todayImports || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Recent Products + Quick Actions */}
      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} lg={16}>
          <Card title="最近产品">
            <Table
              dataSource={displayStats?.recentProducts || []}
              columns={recentProductColumns}
              rowKey="id"
              pagination={false}
              locale={{ emptyText: '暂无产品' }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="快捷操作">
            <div className="flex flex-col gap-3">
              <Link href="/admin/products/import">
                <Button block icon={<ImportOutlined />}>批量导入</Button>
              </Link>
              <Link href="/admin/products?tab=review">
                <Button block icon={<AuditOutlined />}>审核产品</Button>
              </Link>
              <Link href="/admin/settings/cache">
                <Button block icon={<ClearOutlined />}>清除缓存</Button>
              </Link>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
