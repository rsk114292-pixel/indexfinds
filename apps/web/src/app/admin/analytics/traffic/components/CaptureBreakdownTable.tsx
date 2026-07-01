'use client';

import { Card, Select, Table, Tag } from 'antd';
import {
  formatBrowserContextLabel,
  formatDeviceTypeLabel,
  formatTrafficSourceLabel,
} from './traffic-labels';

export type CaptureBreakdownDimension =
  | 'source'
  | 'campaign'
  | 'browser'
  | 'deviceType'
  | 'browserContext'
  | 'locale';

interface CaptureDiagnosticsDimensionBreakdown {
  dimension: string;
  value: string;
  firstPartyVisits: number;
  gaCaptures: number;
  blockedOrFailed: number;
  pendingConsent: number;
  inAppBrowserVisits: number;
  captureRate: number;
}

const dimensionOptions: Array<{
  label: string;
  value: CaptureBreakdownDimension;
}> = [
  { label: '来源', value: 'source' },
  { label: '推广活动', value: 'campaign' },
  { label: '浏览器', value: 'browser' },
  { label: '设备类型', value: 'deviceType' },
  { label: '浏览器上下文', value: 'browserContext' },
  { label: '语言 / 地区', value: 'locale' },
];

export function formatBreakdownValue(
  dimension: CaptureBreakdownDimension,
  value: string,
): string {
  if (dimension === 'source') {
    return formatTrafficSourceLabel(value);
  }

  if (dimension === 'browserContext') {
    return formatBrowserContextLabel(value);
  }

  if (dimension === 'deviceType') {
    return formatDeviceTypeLabel(value);
  }

  return value;
}

const columns = [
  {
    title: '维度值',
    dataIndex: 'value',
    key: 'value',
    render: (value: string, record: CaptureDiagnosticsDimensionBreakdown) => (
      <span className="font-medium">
        {formatBreakdownValue(record.dimension as CaptureBreakdownDimension, value)}
      </span>
    ),
  },
  {
    title: '首方访问',
    dataIndex: 'firstPartyVisits',
    key: 'firstPartyVisits',
  },
  {
    title: 'GA 捕获',
    dataIndex: 'gaCaptures',
    key: 'gaCaptures',
  },
  {
    title: '捕获率',
    dataIndex: 'captureRate',
    key: 'captureRate',
    render: (value: number) => {
      const color = value >= 80 ? 'green' : value >= 50 ? 'blue' : 'orange';
      return <Tag color={color}>{value}%</Tag>;
    },
  },
  {
    title: '拦截 / 失败',
    dataIndex: 'blockedOrFailed',
    key: 'blockedOrFailed',
  },
  {
    title: '待同意',
    dataIndex: 'pendingConsent',
    key: 'pendingConsent',
  },
  {
    title: '内置浏览器',
    dataIndex: 'inAppBrowserVisits',
    key: 'inAppBrowserVisits',
  },
];

export default function CaptureBreakdownTable({
  dimension,
  data,
  onDimensionChange,
}: {
  dimension: CaptureBreakdownDimension;
  data: CaptureDiagnosticsDimensionBreakdown[];
  onDimensionChange: (next: CaptureBreakdownDimension) => void;
}) {
  return (
    <Card
      title="推荐流量采集分布"
      extra={
        <Select
          value={dimension}
          onChange={onDimensionChange}
          options={dimensionOptions}
          style={{ minWidth: 180 }}
        />
      }
    >
      <Table
        dataSource={data}
        columns={columns}
        rowKey={(row) => `${row.dimension}:${row.value}`}
        pagination={false}
        size="small"
      />
    </Card>
  );
}
