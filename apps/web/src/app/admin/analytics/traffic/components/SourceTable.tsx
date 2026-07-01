'use client';

import { useMemo } from 'react';
import { Alert, Card, Table, Tag } from 'antd';
import type { TableColumnsType } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { EmptyState } from '../../../components/EmptyState';
import { formatTrafficSourceLabel } from './traffic-labels';
import {
  formatPercent,
  getTrafficAction,
  getTrafficActionColor,
  getOutboundVisitCount,
  getTrafficOpportunityScore,
  getTrafficRiskColor,
  getTrafficRiskLabel,
} from './traffic-scoring';

interface SourceBreakdown {
  source: string;
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
  measuredVisits: number;
  avgActiveDurationMs: number;
  shortStayRate: number;
  engaged10sRate: number;
  engaged30sRate: number;
  avgActiveBeforeOutboundMs: number;
}

type SourceTableVariant = 'operations' | 'attribution' | 'fraud';

function getFraudReviewHint(record: SourceBreakdown): string {
  if (record.suspiciousRate >= 30 && record.suspiciousVisits >= 20) {
    return '优先检查是否存在脚本重放或异常入口循环';
  }

  if (record.suspiciousRate >= 30) {
    return '先看设备和来源链路是否异常集中';
  }

  if (record.suspiciousVisits >= 10) {
    return '建议抽样复核时间分布与设备画像';
  }

  if (record.uniqueVisitors <= 3 && record.suspiciousVisits > 0) {
    return '疑似少量设备重复刷新，先看设备明细';
  }

  return '当前重复压力可控，继续观察';
}

function formatDurationMs(value: number): string {
  if (!value || value <= 0) return '0s';
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

function getMeasurementCoverage(record: SourceBreakdown): number {
  if (!record.count || record.count <= 0) return 0;
  return Math.round((record.measuredVisits / record.count) * 1000) / 10;
}

function getColumns(variant: SourceTableVariant) {
  const baseColumns: TableColumnsType<SourceBreakdown> = [
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
      dataIndex: 'count',
      key: 'count',
      sorter: (a: SourceBreakdown, b: SourceBreakdown) => a.count - b.count,
      render: (count: number, record: SourceBreakdown) => (
        <div>
          <div className="font-medium text-gray-900">{count}</div>
          <div className="text-xs text-gray-400">
            原始 {record.rawCount} / 设备 {record.uniqueVisitors}
          </div>
        </div>
      ),
    },
  ];

  if (variant === 'fraud') {
    return [
      ...baseColumns,
      {
        title: '重复差值',
        dataIndex: 'suspiciousVisits',
        key: 'suspiciousVisits',
        sorter: (a: SourceBreakdown, b: SourceBreakdown) =>
          a.suspiciousVisits - b.suspiciousVisits,
        render: (value: number) => <span className="font-medium text-red-600">{value}</span>,
      },
      {
        title: '重复占比',
        dataIndex: 'suspiciousRate',
        key: 'suspiciousRate',
        sorter: (a: SourceBreakdown, b: SourceBreakdown) =>
          a.suspiciousRate - b.suspiciousRate,
        render: (rate: number) => (
          <div>
            <Tag color={getTrafficRiskColor(rate)}>{getTrafficRiskLabel(rate)}</Tag>
            <div className="text-xs text-gray-400">{formatPercent(rate)}</div>
          </div>
        ),
      },
      {
        title: '设备覆盖',
        dataIndex: 'uniqueVisitors',
        key: 'uniqueVisitors',
        sorter: (a: SourceBreakdown, b: SourceBreakdown) =>
          a.uniqueVisitors - b.uniqueVisitors,
        render: (value: number, record: SourceBreakdown) => (
          <div>
            <div className="font-medium text-gray-900">{value}</div>
            <div className="text-xs text-gray-400">
              {record.suspiciousVisits > 0 && value > 0
                ? `每设备重复 ${Math.max(record.suspiciousVisits / value, 0).toFixed(1)} 次`
                : '暂无重复压力'}
            </div>
          </div>
        ),
      },
      {
        title: '复核重点',
        key: 'reviewHint',
        render: (_: unknown, record: SourceBreakdown) => (
          <span className="text-sm text-gray-600">{getFraudReviewHint(record)}</span>
        ),
      },
    ];
  }

  const columns: TableColumnsType<SourceBreakdown> = [
    ...baseColumns,
    {
      title: '平均浏览',
      dataIndex: 'avgActiveDurationMs',
      key: 'avgActiveDurationMs',
      sorter: (a: SourceBreakdown, b: SourceBreakdown) =>
        a.avgActiveDurationMs - b.avgActiveDurationMs,
      render: (value: number, record: SourceBreakdown) => (
        <div>
          <div className="font-medium text-gray-900">
            {formatDurationMs(value)}
          </div>
          <div className="text-xs text-gray-400">
            时长样本 {record.measuredVisits} / 覆盖{' '}
            {formatPercent(getMeasurementCoverage(record))}
          </div>
        </div>
      ),
    },
    {
      title: '10s / 30s',
      key: 'engagementRates',
      sorter: (a: SourceBreakdown, b: SourceBreakdown) =>
        a.engaged30sRate - b.engaged30sRate,
      render: (_: unknown, record: SourceBreakdown) => (
        <div>
          <Tag color={record.engaged10sRate >= 50 ? 'green' : 'default'}>
            10s {formatPercent(record.engaged10sRate)}
          </Tag>
          <div className="mt-1 text-xs text-gray-400">
            30s {formatPercent(record.engaged30sRate)}
          </div>
        </div>
      ),
    },
    {
      title: '有外跳访问',
      dataIndex: 'outboundClicks',
      key: 'outboundClicks',
      sorter: (a: SourceBreakdown, b: SourceBreakdown) =>
        getOutboundVisitCount(a) - getOutboundVisitCount(b),
      render: (_: number, record: SourceBreakdown) => getOutboundVisitCount(record),
    },
    {
      title: '访问外跳率',
      dataIndex: 'outboundRate',
      key: 'outboundRate',
      sorter: (a: SourceBreakdown, b: SourceBreakdown) =>
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
      sorter: (a: SourceBreakdown, b: SourceBreakdown) =>
        a.effectiveUsers - b.effectiveUsers,
    },
    {
      title: '有效新用户率',
      dataIndex: 'effectiveUserRate',
      key: 'effectiveUserRate',
      sorter: (a: SourceBreakdown, b: SourceBreakdown) =>
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
      sorter: (a: SourceBreakdown, b: SourceBreakdown) =>
        a.suspiciousRate - b.suspiciousRate,
      render: (rate: number, record: SourceBreakdown) => (
        <div>
          <Tag color={getTrafficRiskColor(rate)}>{getTrafficRiskLabel(rate)}</Tag>
          <div className="text-xs text-gray-400">
            差值 {record.suspiciousVisits} / {formatPercent(rate)}
          </div>
        </div>
      ),
    },
  ];

  if (variant === 'operations') {
    columns.push({
      title: '运营建议',
      key: 'action',
      render: (_: unknown, record: SourceBreakdown) => {
        const action = getTrafficAction(record);
        return <Tag color={getTrafficActionColor(action)}>{action}</Tag>;
      },
    });
  }

  return columns;
}

function getCardMeta(variant: SourceTableVariant) {
  if (variant === 'attribution') {
    return {
      title: '来源识别明细',
      extra: '默认按去重访问排序；这里优先解释来源是否可识别，不直接给投放动作建议',
    };
  }

  if (variant === 'fraud') {
    return {
      title: '来源复核明细',
      extra: '默认按重复记录占比排序；这里只看风险，不直接展示有效新用户等经营结果',
    };
  }

  return {
    title: '来源诊断',
    extra:
      '默认按可投性排序；有效新用户=当前时间窗内完成注册、验证、3 个商品浏览且至少一次收藏或外跳',
  };
}

export default function SourceTable({
  data,
  variant = 'operations',
}: {
  data: SourceBreakdown[];
  variant?: SourceTableVariant;
}) {
  const sortedData = useMemo(() => {
    if (variant === 'attribution') {
      return [...data].sort((a, b) => b.count - a.count);
    }

    if (variant === 'fraud') {
      return [...data].sort((a, b) => {
        if (b.suspiciousRate !== a.suspiciousRate) {
          return b.suspiciousRate - a.suspiciousRate;
        }
        return b.suspiciousVisits - a.suspiciousVisits;
      });
    }

    return [...data].sort((a, b) => getTrafficOpportunityScore(b) - getTrafficOpportunityScore(a));
  }, [data, variant]);
  const cardMeta = getCardMeta(variant);
  const columns = useMemo(() => getColumns(variant), [variant]);
  const hasMaterialFraudSignal =
    variant === 'fraud'
      ? sortedData.some((item) => item.suspiciousVisits > 0 || item.suspiciousRate > 0)
      : true;

  return (
    <Card
      title={cardMeta.title}
      extra={<span className="text-xs text-gray-400">{cardMeta.extra}</span>}
    >
      {variant === 'fraud' && !hasMaterialFraudSignal ? (
        <Alert
          className="mb-4"
          type="success"
          showIcon
          message="暂无显著异常来源"
          description="当前时间窗内来源层面的原始记录与去重访问基本一致，优先将这里视为复核台账，而不是立即触发风控动作。"
        />
      ) : null}
      <Table
        dataSource={sortedData}
        columns={columns}
        rowKey="source"
        locale={{
          emptyText: (
            <EmptyState
              icon={<GlobalOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
              title="暂无来源数据"
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
