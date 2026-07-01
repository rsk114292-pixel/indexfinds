'use client';

import { Card, Table, Tag } from 'antd';
import { ProfileOutlined } from '@ant-design/icons';
import { EmptyState } from '../../../components/EmptyState';

interface TrafficBehaviorSample {
  userId: string;
  email: string | null;
  latestVisitAt: string;
  landingPage: string | null;
  campaign: string | null;
  registered: boolean;
  emailVerified: boolean;
  productViews: number;
  actionReady: boolean;
  effectiveUser: boolean;
  blocker: 'unverified' | 'insufficient_product_views' | 'missing_action' | 'effective';
}

function blockerLabel(blocker: TrafficBehaviorSample['blocker']): string {
  if (blocker === 'unverified') return '待验邮箱';
  if (blocker === 'insufficient_product_views') return '浏览不足';
  if (blocker === 'missing_action') return '缺少动作';
  return '已成为有效新用户';
}

function blockerColor(blocker: TrafficBehaviorSample['blocker']): string {
  if (blocker === 'effective') return 'green';
  if (blocker === 'missing_action') return 'blue';
  return 'orange';
}

export default function BehaviorSampleTable({
  title,
  data,
}: {
  title: string;
  data: TrafficBehaviorSample[];
}) {
  const columns = [
    {
      title: '用户',
      dataIndex: 'email',
      key: 'email',
      render: (email: string | null, record: TrafficBehaviorSample) => (
        <div>
          <div className="font-medium text-gray-900">{email || record.userId}</div>
          <div className="text-xs text-gray-400">{record.userId}</div>
        </div>
      ),
    },
    {
      title: '最近访问',
      dataIndex: 'latestVisitAt',
      key: 'latestVisitAt',
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: '落地页',
      dataIndex: 'landingPage',
      key: 'landingPage',
      render: (value: string | null) => (
        <span className="block max-w-[280px] truncate" title={value || '-'}>
          {value || '-'}
        </span>
      ),
    },
    {
      title: '活动',
      dataIndex: 'campaign',
      key: 'campaign',
      render: (value: string | null) => value || '-',
    },
    {
      title: '浏览商品数',
      dataIndex: 'productViews',
      key: 'productViews',
    },
    {
      title: '邮箱验证',
      dataIndex: 'emailVerified',
      key: 'emailVerified',
      render: (value: boolean) => (
        <Tag color={value ? 'green' : 'default'}>{value ? '已验证' : '未验证'}</Tag>
      ),
    },
    {
      title: '动作达标',
      dataIndex: 'actionReady',
      key: 'actionReady',
      render: (value: boolean) => (
        <Tag color={value ? 'green' : 'default'}>{value ? '已达标' : '未达标'}</Tag>
      ),
    },
    {
      title: '当前状态',
      dataIndex: 'blocker',
      key: 'blocker',
      render: (value: TrafficBehaviorSample['blocker']) => (
        <Tag color={blockerColor(value)}>{blockerLabel(value)}</Tag>
      ),
    },
  ];

  return (
    <Card title={title}>
      <Table
        dataSource={data}
        columns={columns}
        rowKey="userId"
        size="small"
        pagination={{ pageSize: 8 }}
        locale={{
          emptyText: (
            <EmptyState
              icon={<ProfileOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
              title="暂无样本"
              description="当前来源下没有可展示的注册样本"
            />
          ),
        }}
      />
    </Card>
  );
}
