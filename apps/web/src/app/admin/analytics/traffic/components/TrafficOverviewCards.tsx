'use client';

import { Card, Row, Col, Statistic, Tooltip } from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ExportOutlined,
  SafetyCertificateOutlined,
  DashboardOutlined,
} from '@ant-design/icons';

interface TrafficOverview {
  uniqueSessions: number;
  uniqueSessionsChange: number;
  uniqueVisitors: number;
  uniqueVisitorsChange: number;
  totalOutboundVisits?: number;
  totalOutboundVisitsChange?: number;
  outboundVisitRate?: number;
  highIntentVisitors: number;
  highIntentVisitorsChange: number;
  highIntentVisitorRate: number;
  activatedUsers: number;
  activatedUsersChange: number;
  activatedUserRate: number;
  effectiveNewUsers: number;
  effectiveNewUsersChange: number;
  effectiveNewUserRate: number;
  effectiveUsers: number;
  effectiveUsersChange: number;
  effectiveUserRate: number;
}

interface TrafficOverviewCardsProps {
  data: TrafficOverview | null;
  totalOutboundVisits: number;
  outboundVisitRate: number;
}

function ChangeIndicator({ change }: { change: number }) {
  if (change === 0) return <span className="text-gray-400 text-xs">-</span>;
  const isPositive = change >= 0;
  return (
    <Tooltip title={`环比变化 ${change}%`}>
      <span className={`text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
        {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
        {Math.abs(change)}%
      </span>
    </Tooltip>
  );
}

export default function TrafficOverviewCards({
  data,
  totalOutboundVisits,
  outboundVisitRate,
}: TrafficOverviewCardsProps) {
  return (
    <Row gutter={[16, 16]} className="mb-6">
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title={
              <div className="flex items-center justify-between">
                <Tooltip title="包含外部来源、直接/未归因访问和站内回流的去重访问，是运营总览页的总样本。">
                  <span>全部去重访问</span>
                </Tooltip>
                {data && <ChangeIndicator change={data.uniqueSessionsChange} />}
              </div>
            }
            value={data?.uniqueSessions || 0}
            prefix={<TeamOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6} xl={5}>
        <Card>
          <Statistic
            title={
              <div className="flex items-center justify-between">
                <Tooltip title="去重后的设备数，适合看受众覆盖。">
                  <span>去重设备</span>
                </Tooltip>
                {data && <ChangeIndicator change={data.uniqueVisitorsChange} />}
              </div>
            }
            value={data?.uniqueVisitors || 0}
            prefix={<UserOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6} xl={5}>
        <Card>
          <Statistic
            title={
              <div className="flex items-center justify-between">
                <Tooltip title="当前时间窗内浏览至少 3 个不同商品，且至少发生过一次收藏或购买外跳的访客。这个口径允许匿名访客。">
                  <span>高意向访客</span>
                </Tooltip>
                {data && (
                  <ChangeIndicator change={data.highIntentVisitorsChange} />
                )}
              </div>
            }
            value={data?.highIntentVisitors || 0}
            prefix={<SafetyCertificateOutlined />}
            valueStyle={{ color: '#13c2c2' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6} xl={5}>
        <Card>
          <Statistic
            title={
              <div className="flex items-center justify-between">
                <Tooltip title="当前时间窗内满足深度行为阈值的已验证用户，不限制是否在本窗口注册。">
                  <span>激活用户</span>
                </Tooltip>
                {data && <ChangeIndicator change={data.activatedUsersChange} />}
              </div>
            }
            value={data?.activatedUsers || 0}
            prefix={<DashboardOutlined />}
            valueStyle={{ color: '#722ed1' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6} xl={5}>
        <Card>
          <Statistic
            title={
              <div className="flex items-center justify-between">
                <Tooltip title="当前时间窗内新注册、已验证，并完成深度行为阈值的用户。这个口径专门用于衡量拉新质量。">
                  <span>有效新用户</span>
                </Tooltip>
                {data && (
                  <ChangeIndicator change={data.effectiveNewUsersChange} />
                )}
              </div>
            }
            value={data?.effectiveNewUsers || 0}
            prefix={<ExportOutlined />}
            valueStyle={{ color: '#1677ff' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6} xl={5}>
        <Card>
          <Statistic
            title={
              <Tooltip title="有效新用户率 = 有效新用户 / 去重访问。它只反映当前时间窗内的新用户转化质量。">
                <span>有效新用户率</span>
              </Tooltip>
            }
            value={data?.effectiveNewUserRate || 0}
            suffix="%"
            prefix={<DashboardOutlined />}
            valueStyle={{ color: '#531dab' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6} xl={5}>
        <Card>
          <Statistic
            title={
              <Tooltip title="当前时间窗内至少发生过一次购买外跳的去重访问数，不等于外跳点击事件总数。">
                <span>有外跳访问</span>
              </Tooltip>
            }
            value={totalOutboundVisits}
            prefix={<ExportOutlined />}
            valueStyle={{ color: '#1677ff' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6} xl={5}>
        <Card>
          <Statistic
            title={
              <Tooltip title="有外跳访问 / 全部去重访问。">
                <span>访问外跳率</span>
              </Tooltip>
            }
            value={outboundVisitRate}
            suffix="%"
            prefix={<DashboardOutlined />}
            valueStyle={{ color: '#531dab' }}
          />
        </Card>
      </Col>
    </Row>
  );
}
