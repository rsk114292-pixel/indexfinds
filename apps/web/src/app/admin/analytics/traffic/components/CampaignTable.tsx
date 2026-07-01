'use client';

import { useMemo } from 'react';
import { Card, Table, Tag } from 'antd';
import { FlagOutlined } from '@ant-design/icons';
import { EmptyState } from '../../../components/EmptyState';
import {
  formatPercent,
  getTrafficAction,
  getTrafficActionColor,
  getOutboundVisitCount,
  getTrafficOpportunityScore,
  getTrafficRiskColor,
  getTrafficRiskLabel,
} from './traffic-scoring';

interface CampaignBreakdown {
  campaign: string;
  source: string | null;
  medium: string | null;
  rawCount: number;
  count: number;
  uniqueVisitors: number;
  suspiciousVisits: number;
  suspiciousRate: number;
  outboundVisits?: number;
  outboundClicks: number;
  outboundRate: number;
  effectiveUsers: number;
  effectiveUserRate: number;
}

const columns = [
  {
    title: '推广活动',
    dataIndex: 'campaign',
    key: 'campaign',
    render: (campaign: string) => (
      <span className="font-medium">{campaign}</span>
    ),
  },
  {
    title: '来源 / 媒介',
    key: 'sourceMedium',
    render: (_: unknown, record: CampaignBreakdown) => (
      <span className="text-gray-500 text-sm">
        {record.source || '-'} / {record.medium || '-'}
      </span>
    ),
  },
  {
    title: '去重访问',
    dataIndex: 'count',
    key: 'count',
    sorter: (a: CampaignBreakdown, b: CampaignBreakdown) => a.count - b.count,
    render: (count: number, record: CampaignBreakdown) => (
      <div>
        <div className="font-medium text-gray-900">{count}</div>
        <div className="text-xs text-gray-400">
          原始 {record.rawCount} / 设备 {record.uniqueVisitors}
        </div>
      </div>
    ),
  },
  {
    title: '有外跳访问',
    dataIndex: 'outboundClicks',
    key: 'outboundClicks',
    sorter: (a: CampaignBreakdown, b: CampaignBreakdown) =>
      getOutboundVisitCount(a) - getOutboundVisitCount(b),
    render: (_: number, record: CampaignBreakdown) => getOutboundVisitCount(record),
  },
  {
    title: '访问外跳率',
    dataIndex: 'outboundRate',
    key: 'outboundRate',
    sorter: (a: CampaignBreakdown, b: CampaignBreakdown) =>
      a.outboundRate - b.outboundRate,
    render: (rate: number) => {
      const color = rate > 5 ? 'green' : rate > 2 ? 'blue' : 'default';
      return <Tag color={color}>{formatPercent(rate)}</Tag>;
    },
  },
  {
    title: '有效新用户',
    dataIndex: 'effectiveUsers',
    key: 'effectiveUsers',
    sorter: (a: CampaignBreakdown, b: CampaignBreakdown) =>
      a.effectiveUsers - b.effectiveUsers,
  },
  {
    title: '有效新用户率',
    dataIndex: 'effectiveUserRate',
    key: 'effectiveUserRate',
    sorter: (a: CampaignBreakdown, b: CampaignBreakdown) =>
      a.effectiveUserRate - b.effectiveUserRate,
    render: (rate: number) => {
      const color = rate >= 3 ? 'green' : rate >= 1 ? 'blue' : 'default';
      return <Tag color={color}>{formatPercent(rate)}</Tag>;
    },
  },
  {
    title: '重复记录',
    dataIndex: 'suspiciousRate',
    key: 'suspiciousRate',
    sorter: (a: CampaignBreakdown, b: CampaignBreakdown) => a.suspiciousRate - b.suspiciousRate,
    render: (rate: number, record: CampaignBreakdown) => (
      <div>
        <Tag color={getTrafficRiskColor(rate)}>{getTrafficRiskLabel(rate)}</Tag>
        <div className="text-xs text-gray-400">
          差值 {record.suspiciousVisits} / {formatPercent(rate)}
        </div>
      </div>
    ),
  },
  {
    title: '运营建议',
    key: 'action',
    render: (_: unknown, record: CampaignBreakdown) => {
      const action = getTrafficAction(record);
      return <Tag color={getTrafficActionColor(action)}>{action}</Tag>;
    },
  },
];

export default function CampaignTable({ data }: { data: CampaignBreakdown[] }) {
  const sortedData = useMemo(
    () => [...data].sort((a, b) => getTrafficOpportunityScore(b) - getTrafficOpportunityScore(a)),
    [data],
  );

  return (
    <Card
      title="推广活动诊断"
      extra={<span className="text-xs text-gray-400">优先看有效新用户率，其次看访问外跳率和重复记录；有效新用户口径只统计当前时间窗内完成激活的新注册用户</span>}
    >
      <Table
        dataSource={sortedData}
        columns={columns}
        rowKey="campaign"
        locale={{
          emptyText: (
            <EmptyState
              icon={<FlagOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
              title="暂无推广活动数据"
              description="使用 UTM 参数的链接访问后将在此显示"
            />
          ),
        }}
        pagination={{ pageSize: 10 }}
        size="small"
      />
    </Card>
  );
}
