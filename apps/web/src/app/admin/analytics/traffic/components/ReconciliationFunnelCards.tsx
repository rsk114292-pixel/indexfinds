'use client';

import { Card, Col, Row, Statistic, Tooltip } from 'antd';
import {
  LinkOutlined,
  LoginOutlined,
  PartitionOutlined,
  LineChartOutlined,
} from '@ant-design/icons';

interface ReconciliationOverview {
  referralClicks: number;
  landingVisits: number;
  firstPartyVisits: number;
  unmatchedFirstPartyVisits: number;
  gaCaptures: number;
  clickToLandingRate: number;
  landingToFirstPartyRate: number;
  gaCaptureRate: number;
}

function percent(value: number): string {
  return `${value}%`;
}

export default function ReconciliationFunnelCards({
  data,
}: {
  data: ReconciliationOverview | null;
}) {
  return (
    <Row gutter={[16, 16]} className="mb-6">
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="推荐短链点击"
            value={data?.referralClicks || 0}
            prefix={<LinkOutlined />}
            valueStyle={{ color: '#1677ff' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title={
              <Tooltip title="在当前时间窗内能够回连到短链点击的闭环首方访问。这里是严格闭环样本，不会超过短链点击数。">
                <span>闭环首方访问</span>
              </Tooltip>
            }
            value={data?.landingVisits || 0}
            prefix={<LoginOutlined />}
            valueStyle={{ color: '#13c2c2' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title={
              <Tooltip title="所有带推荐归因的去重首方访问，包含未能在同窗口内闭环回短链点击的访问。">
                <span>推荐首方访问</span>
              </Tooltip>
            }
            value={data?.firstPartyVisits || 0}
            prefix={<PartitionOutlined />}
            valueStyle={{ color: '#722ed1' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="GA 首次页面浏览"
            value={data?.gaCaptures || 0}
            prefix={<LineChartOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card size="small">
          <Statistic
            title="点击 -> 闭环首方率"
            value={data ? percent(data.clickToLandingRate) : '0%'}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card size="small">
          <Statistic
            title="首方闭环覆盖率"
            value={data ? percent(data.landingToFirstPartyRate) : '0%'}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card size="small">
          <Statistic title="首方 -> GA 捕获率" value={data ? percent(data.gaCaptureRate) : '0%'} />
        </Card>
      </Col>
      <Col xs={24}>
        <Card size="small">
          <Statistic title="未闭环首方访问" value={data?.unmatchedFirstPartyVisits || 0} />
        </Card>
      </Col>
    </Row>
  );
}
