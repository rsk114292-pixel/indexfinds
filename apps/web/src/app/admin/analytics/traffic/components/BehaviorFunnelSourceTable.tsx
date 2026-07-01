'use client';

import { useMemo } from 'react';
import { Card, Table, Tag } from 'antd';
import { FunnelPlotOutlined } from '@ant-design/icons';
import { EmptyState } from '../../../components/EmptyState';
import { formatTrafficSourceLabel } from './traffic-labels';

interface TrafficBehaviorFunnelBySource {
  source: string;
  visits: number;
  registrations: number;
  verifiedUsers: number;
  productViewReadyUsers: number;
  actionReadyUsers: number;
  effectiveUsers: number;
  visitToRegistrationRate: number;
  registrationToEffectiveRate: number;
  visitToEffectiveRate: number;
}

function percent(value: number): string {
  return `${value}%`;
}

const columns = [
  {
    title: '来源',
    dataIndex: 'source',
    key: 'source',
    render: (source: string) => (
      <span className="font-medium">{formatTrafficSourceLabel(source)}</span>
    ),
  },
  {
    title: '去重访问',
    dataIndex: 'visits',
    key: 'visits',
    sorter: (a: TrafficBehaviorFunnelBySource, b: TrafficBehaviorFunnelBySource) =>
      a.visits - b.visits,
  },
  {
    title: '注册',
    dataIndex: 'registrations',
    key: 'registrations',
    sorter: (a: TrafficBehaviorFunnelBySource, b: TrafficBehaviorFunnelBySource) =>
      a.registrations - b.registrations,
  },
  {
    title: '已验邮箱',
    dataIndex: 'verifiedUsers',
    key: 'verifiedUsers',
    sorter: (a: TrafficBehaviorFunnelBySource, b: TrafficBehaviorFunnelBySource) =>
      a.verifiedUsers - b.verifiedUsers,
  },
  {
    title: '浏览达标',
    dataIndex: 'productViewReadyUsers',
    key: 'productViewReadyUsers',
    sorter: (a: TrafficBehaviorFunnelBySource, b: TrafficBehaviorFunnelBySource) =>
      a.productViewReadyUsers - b.productViewReadyUsers,
  },
  {
    title: '动作达标',
    dataIndex: 'actionReadyUsers',
    key: 'actionReadyUsers',
    sorter: (a: TrafficBehaviorFunnelBySource, b: TrafficBehaviorFunnelBySource) =>
      a.actionReadyUsers - b.actionReadyUsers,
  },
  {
    title: '有效新用户',
    dataIndex: 'effectiveUsers',
    key: 'effectiveUsers',
    sorter: (a: TrafficBehaviorFunnelBySource, b: TrafficBehaviorFunnelBySource) =>
      a.effectiveUsers - b.effectiveUsers,
  },
  {
    title: '访问->注册',
    dataIndex: 'visitToRegistrationRate',
    key: 'visitToRegistrationRate',
    sorter: (a: TrafficBehaviorFunnelBySource, b: TrafficBehaviorFunnelBySource) =>
      a.visitToRegistrationRate - b.visitToRegistrationRate,
    render: (value: number) => {
      const color = value >= 5 ? 'green' : value >= 1 ? 'blue' : 'default';
      return <Tag color={color}>{percent(value)}</Tag>;
    },
  },
  {
    title: '注册->有效新用户',
    dataIndex: 'registrationToEffectiveRate',
    key: 'registrationToEffectiveRate',
    sorter: (a: TrafficBehaviorFunnelBySource, b: TrafficBehaviorFunnelBySource) =>
      a.registrationToEffectiveRate - b.registrationToEffectiveRate,
    render: (value: number) => {
      const color = value >= 30 ? 'green' : value >= 10 ? 'blue' : 'default';
      return <Tag color={color}>{percent(value)}</Tag>;
    },
  },
  {
    title: '访问->有效新用户',
    dataIndex: 'visitToEffectiveRate',
    key: 'visitToEffectiveRate',
    sorter: (a: TrafficBehaviorFunnelBySource, b: TrafficBehaviorFunnelBySource) =>
      a.visitToEffectiveRate - b.visitToEffectiveRate,
    render: (value: number) => {
      const color = value >= 3 ? 'green' : value >= 1 ? 'blue' : 'default';
      return <Tag color={color}>{percent(value)}</Tag>;
    },
  },
];

export default function BehaviorFunnelSourceTable({
  data,
}: {
  data: TrafficBehaviorFunnelBySource[];
}) {
  const sortedData = useMemo(
    () =>
      [...data].sort((a, b) => {
        if (b.effectiveUsers !== a.effectiveUsers) {
          return b.effectiveUsers - a.effectiveUsers;
        }

        return b.visitToEffectiveRate - a.visitToEffectiveRate;
      }),
    [data],
  );

  return (
    <Card
      title="来源漏斗对比"
      extra={
        <span className="text-xs text-gray-400">
          默认按有效新用户数排序，适合快速定位真正能带来高质量拉新的来源
        </span>
      }
    >
      <Table
        dataSource={sortedData}
        columns={columns}
        rowKey="source"
        size="small"
        pagination={{ pageSize: 10 }}
        locale={{
          emptyText: (
            <EmptyState
              icon={
                <FunnelPlotOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
              }
              title="暂无漏斗数据"
              description="当前时间范围内没有形成注册到有效新用户的来源数据"
            />
          ),
        }}
      />
    </Card>
  );
}
