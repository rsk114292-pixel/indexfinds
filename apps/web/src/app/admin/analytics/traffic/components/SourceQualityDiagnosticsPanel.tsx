'use client';

import { Card, Col, Row, Table, Tag } from 'antd';
import { AimOutlined } from '@ant-design/icons';
import { EmptyState } from '../../../components/EmptyState';
import { formatPercent } from './traffic-scoring';

interface SourceLandingPageDiagnostic {
  landingPage: string;
  visits: number;
  share: number;
}

interface SourceQualityDiagnostics {
  source: string;
  rawCount: number;
  visits: number;
  uniqueVisitors: number;
  repeatVisitRate: number;
  outboundVisits: number;
  outboundRate: number;
  effectiveUsers: number;
  effectiveUserRate: number;
  avgProductViewsPerVisitor: number;
  oneVisitDeviceRate: number;
  concentration: {
    distinctDevices: number;
    distinctIpAddresses: number;
    distinctBrowsers: number;
    topDeviceShare: number;
    topIpShare: number;
    topBrowser: string | null;
    topBrowserShare: number;
  };
  landingPages: SourceLandingPageDiagnostic[];
}

const landingColumns = [
  {
    title: '落地页',
    dataIndex: 'landingPage',
    key: 'landingPage',
    render: (value: string) => (
      <span className="font-medium text-gray-900">{value}</span>
    ),
  },
  {
    title: '去重访问',
    dataIndex: 'visits',
    key: 'visits',
    sorter: (
      a: SourceLandingPageDiagnostic,
      b: SourceLandingPageDiagnostic,
    ) => a.visits - b.visits,
  },
  {
    title: '占该来源',
    dataIndex: 'share',
    key: 'share',
    sorter: (
      a: SourceLandingPageDiagnostic,
      b: SourceLandingPageDiagnostic,
    ) => a.share - b.share,
    render: (value: number) => <Tag color="blue">{formatPercent(value)}</Tag>,
  },
];

function MetricTile({
  label,
  value,
  detail,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: 'default' | 'risk' | 'good';
}) {
  const toneClass =
    tone === 'risk'
      ? 'border-amber-200 bg-amber-50'
      : tone === 'good'
        ? 'border-emerald-200 bg-emerald-50'
        : 'border-gray-200 bg-white';

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
      <div className="mt-1 text-xs text-gray-500">{detail}</div>
    </div>
  );
}

export default function SourceQualityDiagnosticsPanel({
  data,
}: {
  data: SourceQualityDiagnostics | null;
}) {
  const concentration = data?.concentration;

  return (
    <Card
      title={`${data?.source || 'lolobuyspreadsheets.com'} 来源质量诊断`}
      extra={
        <span className="text-xs text-gray-400">
          外部 referral 单独评估，不归为自有导流，也不混入 Direct 问题
        </span>
      }
    >
      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} md={12} xl={6}>
          <MetricTile
            label="去重访问"
            value={data?.visits || 0}
            detail={`原始 ${data?.rawCount || 0} / 设备 ${data?.uniqueVisitors || 0}`}
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <MetricTile
            label="访问外跳率"
            value={formatPercent(data?.outboundRate || 0)}
            detail={`有外跳访问 ${data?.outboundVisits || 0}`}
            tone={(data?.outboundRate || 0) >= 5 ? 'good' : 'default'}
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <MetricTile
            label="有效新用户率"
            value={formatPercent(data?.effectiveUserRate || 0)}
            detail={`有效新用户 ${data?.effectiveUsers || 0}`}
            tone={(data?.effectiveUserRate || 0) >= 3 ? 'good' : 'default'}
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <MetricTile
            label="一设备一访问"
            value={formatPercent(data?.oneVisitDeviceRate || 0)}
            detail="用于判断来源是否更像批量新设备噪音"
            tone={(data?.oneVisitDeviceRate || 0) >= 80 ? 'risk' : 'default'}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} md={12} xl={6}>
          <MetricTile
            label="商品浏览深度"
            value={data?.avgProductViewsPerVisitor || 0}
            detail="按该来源设备平均去重商品浏览"
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <MetricTile
            label="重复访问率"
            value={formatPercent(data?.repeatVisitRate || 0)}
            detail="原始记录与去重访问的差值占比"
            tone={(data?.repeatVisitRate || 0) >= 30 ? 'risk' : 'default'}
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <MetricTile
            label="Top IP 集中度"
            value={formatPercent(concentration?.topIpShare || 0)}
            detail={`IP 桶 ${concentration?.distinctIpAddresses || 0}`}
            tone={(concentration?.topIpShare || 0) >= 30 ? 'risk' : 'default'}
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <MetricTile
            label="Top 浏览器"
            value={formatPercent(concentration?.topBrowserShare || 0)}
            detail={concentration?.topBrowser || '暂无浏览器样本'}
            tone={
              (concentration?.topBrowserShare || 0) >= 50 ? 'risk' : 'default'
            }
          />
        </Col>
      </Row>

      <Table
        dataSource={data?.landingPages || []}
        columns={landingColumns}
        rowKey="landingPage"
        size="small"
        pagination={false}
        locale={{
          emptyText: (
            <EmptyState
              icon={<AimOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
              title="暂无来源诊断数据"
              description="当前时间范围内没有该外部来源的访问样本"
            />
          ),
        }}
      />
    </Card>
  );
}
