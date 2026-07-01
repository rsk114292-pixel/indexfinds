'use client';

import { Card, Col, Row, Statistic, Tooltip } from 'antd';
import {
  ClockCircleOutlined,
  FieldTimeOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons';

export interface TrafficEngagementOverview {
  totalVisits: number;
  measuredVisits: number;
  measurementCoverageRate: number;
  avgActiveDurationMs: number;
  medianActiveDurationMs: number;
  shortStayVisits: number;
  shortStayRate: number;
  engaged10sVisits: number;
  engaged10sRate: number;
  engaged30sVisits: number;
  engaged30sRate: number;
  avgActiveBeforeOutboundMs: number;
}

function formatDurationMs(value: number): string {
  if (!value || value <= 0) return '0s';
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

export default function EngagementOverviewCards({
  data,
}: {
  data: TrafficEngagementOverview | null;
}) {
  return (
    <Row gutter={[16, 16]} className="mb-6">
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title={
              <Tooltip title="只统计页面可见期间通过首方 heartbeat 采集到的有效浏览时长，旧访问不会倒推补齐。">
                <span>平均有效浏览</span>
              </Tooltip>
            }
            value={formatDurationMs(data?.avgActiveDurationMs || 0)}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: '#1677ff' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title={
              <Tooltip title="中位数比平均值更能反映典型访问，能减少少数超长停留对判断的干扰。">
                <span>中位有效浏览</span>
              </Tooltip>
            }
            value={formatDurationMs(data?.medianActiveDurationMs || 0)}
            prefix={<FieldTimeOutlined />}
            valueStyle={{ color: '#13c2c2' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title={
              <Tooltip title="3 秒内短停留访问 / 已形成浏览时长样本的访问。比例过高通常说明来源质量差、页面不匹配，或存在自动化流量。">
                <span>3 秒短停留率</span>
              </Tooltip>
            }
            value={data?.shortStayRate || 0}
            suffix="%"
            prefix={<WarningOutlined />}
            valueStyle={{ color: '#fa8c16' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title={
              <Tooltip title="有效浏览 30 秒以上的访问 / 已形成浏览时长样本的访问，适合判断来源是否带来真实浏览。">
                <span>30 秒浏览率</span>
              </Tooltip>
            }
            value={data?.engaged30sRate || 0}
            suffix="%"
            prefix={<ThunderboltOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title={
              <Tooltip title="已经有浏览时长 heartbeat 的访问 / 当前时间窗去重访问。刚上线时覆盖率会偏低。">
                <span>浏览采集覆盖率</span>
              </Tooltip>
            }
            value={data?.measurementCoverageRate || 0}
            suffix="%"
            prefix={<FieldTimeOutlined />}
            valueStyle={{ color: '#722ed1' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title={
              <Tooltip title="有效浏览 10 秒以上的访问 / 已形成浏览时长样本的访问。">
                <span>10 秒浏览率</span>
              </Tooltip>
            }
            value={data?.engaged10sRate || 0}
            suffix="%"
            prefix={<ThunderboltOutlined />}
            valueStyle={{ color: '#1677ff' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title={
              <Tooltip title="发生首次购买外跳前已经累计的有效浏览时长，用来判断外跳是否来自真实浏览后的决策。">
                <span>外跳前平均浏览</span>
              </Tooltip>
            }
            value={formatDurationMs(data?.avgActiveBeforeOutboundMs || 0)}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: '#531dab' }}
          />
        </Card>
      </Col>
    </Row>
  );
}
