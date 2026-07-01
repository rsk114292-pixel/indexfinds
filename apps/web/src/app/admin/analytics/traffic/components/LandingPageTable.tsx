'use client';

import { useMemo } from 'react';
import { Card, Table, Tag } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
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

interface LandingPageBreakdown {
  landingPage: string;
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
    title: '落地页',
    dataIndex: 'landingPage',
    key: 'landingPage',
    render: (page: string) => (
      <span className="text-sm font-mono truncate max-w-[400px] block" title={page}>
        {page}
      </span>
    ),
  },
  {
    title: '去重访问',
    dataIndex: 'count',
    key: 'count',
    sorter: (a: LandingPageBreakdown, b: LandingPageBreakdown) => a.count - b.count,
    render: (count: number, record: LandingPageBreakdown) => (
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
    sorter: (a: LandingPageBreakdown, b: LandingPageBreakdown) =>
      getOutboundVisitCount(a) - getOutboundVisitCount(b),
    render: (_: number, record: LandingPageBreakdown) => getOutboundVisitCount(record),
  },
  {
    title: '访问外跳率',
    dataIndex: 'outboundRate',
    key: 'outboundRate',
    sorter: (a: LandingPageBreakdown, b: LandingPageBreakdown) =>
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
    sorter: (a: LandingPageBreakdown, b: LandingPageBreakdown) =>
      a.effectiveUsers - b.effectiveUsers,
  },
  {
    title: '有效新用户率',
    dataIndex: 'effectiveUserRate',
    key: 'effectiveUserRate',
    sorter: (a: LandingPageBreakdown, b: LandingPageBreakdown) =>
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
    sorter: (a: LandingPageBreakdown, b: LandingPageBreakdown) => a.suspiciousRate - b.suspiciousRate,
    render: (rate: number, record: LandingPageBreakdown) => (
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
    render: (_: unknown, record: LandingPageBreakdown) => {
      const action = getTrafficAction(record);
      return <Tag color={getTrafficActionColor(action)}>{action}</Tag>;
    },
  },
];

export default function LandingPageTable({ data }: { data: LandingPageBreakdown[] }) {
  const sortedData = useMemo(
    () => [...data].sort((a, b) => getTrafficOpportunityScore(b) - getTrafficOpportunityScore(a)),
    [data],
  );

  return (
    <Card
      title="落地页诊断"
      extra={<span className="text-xs text-gray-400">优先找“高访问低有效新用户率”的承接页，再结合访问外跳率和重复记录定位问题</span>}
    >
      <Table
        dataSource={sortedData}
        columns={columns}
        rowKey="landingPage"
        locale={{
          emptyText: (
            <EmptyState
              icon={<FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
              title="暂无落地页数据"
              description="选定时间范围内暂无流量记录"
            />
          ),
        }}
        pagination={{ pageSize: 10 }}
        size="small"
      />
    </Card>
  );
}
