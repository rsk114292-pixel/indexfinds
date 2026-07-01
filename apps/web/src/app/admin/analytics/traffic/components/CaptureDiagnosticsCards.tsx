'use client';

import { Card, Col, Row, Statistic, Tooltip } from 'antd';
import {
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  StopOutlined,
  WarningOutlined,
  RadarChartOutlined,
  MobileOutlined,
  LineChartOutlined,
  PartitionOutlined,
} from '@ant-design/icons';

interface CaptureDiagnosticsOverview {
  totalVisits: number;
  consentAccepted: number;
  consentRejected: number;
  consentPending: number;
  gaEligibleVisits: number;
  gaRequested: number;
  gaLoaded: number;
  gaReady: number;
  gaFirstPageviewSent: number;
  gaEventCountTotal: number;
  gaBlocked: number;
  gaFailed: number;
  gaDisabled: number;
  inAppBrowserVisits: number;
  overallCaptureRate: number;
  eligibleCaptureRate: number;
}

function percent(value: number): string {
  return `${value}%`;
}

export default function CaptureDiagnosticsCards({
  data,
}: {
  data: CaptureDiagnosticsOverview | null;
}) {
  return (
    <Row gutter={[16, 16]} className="mb-6">
      <Col xs={24} sm={12} lg={8}>
        <Card>
          <Statistic
            title={
              <Tooltip title="按去重首方访问计算的页面浏览采集成功率。这个口径不会再被重复记录放大。">
                <span>去重首方采集成功率</span>
              </Tooltip>
            }
            value={data ? percent(data.overallCaptureRate) : '0%'}
            prefix={<RadarChartOutlined />}
            valueStyle={{ color: '#1677ff' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={8}>
        <Card>
          <Statistic
            title={
              <Tooltip title="已记录首次页面浏览的访问 / 已同意统计且具备采集条件的去重访问。最适合判断真正的客户端掉数。">
                <span>可追踪访问采集率</span>
              </Tooltip>
            }
            value={data ? percent(data.eligibleCaptureRate) : '0%'}
            prefix={<SafetyCertificateOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={8}>
        <Card>
          <Statistic
            title="去重首方访问"
            value={data?.totalVisits || 0}
            prefix={<PartitionOutlined />}
            valueStyle={{ color: '#722ed1' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="可追踪访问"
            value={data?.gaEligibleVisits || 0}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="已记录首次浏览"
            value={data?.gaFirstPageviewSent || 0}
            prefix={<LineChartOutlined />}
            valueStyle={{ color: '#1677ff' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="已同意统计"
            value={data?.consentAccepted || 0}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#13c2c2' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="待同意统计"
            value={data?.consentPending || 0}
            prefix={<WarningOutlined />}
            valueStyle={{ color: '#faad14' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="采集失败 / 被拦截"
            value={(data?.gaBlocked || 0) + (data?.gaFailed || 0)}
            prefix={<StopOutlined />}
            valueStyle={{ color: '#ff4d4f' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="GA 已就绪但未发首次浏览"
            value={Math.max((data?.gaReady || 0) - (data?.gaFirstPageviewSent || 0), 0)}
            prefix={<WarningOutlined />}
            valueStyle={{ color: '#fa8c16' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="配置关闭 / 不可追踪"
            value={data?.gaDisabled || 0}
            prefix={<StopOutlined />}
            valueStyle={{ color: '#8c8c8c' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="内置浏览器访问"
            value={data?.inAppBrowserVisits || 0}
            prefix={<MobileOutlined />}
            valueStyle={{ color: '#fa8c16' }}
          />
        </Card>
      </Col>
    </Row>
  );
}
