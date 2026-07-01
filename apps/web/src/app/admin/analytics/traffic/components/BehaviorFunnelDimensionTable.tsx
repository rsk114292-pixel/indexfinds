'use client';

import { useMemo } from 'react';
import { Card, Table, Tag } from 'antd';
import { TableOutlined } from '@ant-design/icons';
import { EmptyState } from '../../../components/EmptyState';

interface TrafficBehaviorFunnelByDimension {
  dimension: string;
  value: string;
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

export default function BehaviorFunnelDimensionTable({
  title,
  valueLabel,
  data,
}: {
  title: string;
  valueLabel: string;
  data: TrafficBehaviorFunnelByDimension[];
}) {
  const columns = [
    {
      title: valueLabel,
      dataIndex: 'value',
      key: 'value',
      render: (value: string) => (
        <span className="block max-w-[360px] truncate font-medium" title={value}>
          {value}
        </span>
      ),
    },
    {
      title: '访问',
      dataIndex: 'visits',
      key: 'visits',
      sorter: (a: TrafficBehaviorFunnelByDimension, b: TrafficBehaviorFunnelByDimension) =>
        a.visits - b.visits,
    },
    {
      title: '注册',
      dataIndex: 'registrations',
      key: 'registrations',
      sorter: (a: TrafficBehaviorFunnelByDimension, b: TrafficBehaviorFunnelByDimension) =>
        a.registrations - b.registrations,
    },
    {
      title: '有效新用户',
      dataIndex: 'effectiveUsers',
      key: 'effectiveUsers',
      sorter: (a: TrafficBehaviorFunnelByDimension, b: TrafficBehaviorFunnelByDimension) =>
        a.effectiveUsers - b.effectiveUsers,
    },
    {
      title: '访问->注册',
      dataIndex: 'visitToRegistrationRate',
      key: 'visitToRegistrationRate',
      render: (value: number) => {
        const color = value >= 5 ? 'green' : value >= 1 ? 'blue' : 'default';
        return <Tag color={color}>{percent(value)}</Tag>;
      },
    },
    {
      title: '注册->有效新用户',
      dataIndex: 'registrationToEffectiveRate',
      key: 'registrationToEffectiveRate',
      render: (value: number) => {
        const color = value >= 30 ? 'green' : value >= 10 ? 'blue' : 'default';
        return <Tag color={color}>{percent(value)}</Tag>;
      },
    },
    {
      title: '访问->有效新用户',
      dataIndex: 'visitToEffectiveRate',
      key: 'visitToEffectiveRate',
      render: (value: number) => {
        const color = value >= 3 ? 'green' : value >= 1 ? 'blue' : 'default';
        return <Tag color={color}>{percent(value)}</Tag>;
      },
    },
  ];

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
    <Card title={title}>
      <Table
        dataSource={sortedData}
        columns={columns}
        rowKey="value"
        size="small"
        pagination={{ pageSize: 8 }}
        locale={{
          emptyText: (
            <EmptyState
              icon={<TableOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
              title="暂无漏斗维度数据"
              description="当前时间范围内没有形成可读的漏斗维度样本"
            />
          ),
        }}
      />
    </Card>
  );
}
