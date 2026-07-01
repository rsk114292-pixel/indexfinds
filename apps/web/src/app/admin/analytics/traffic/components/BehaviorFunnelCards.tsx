'use client';

import { Card, Col, Row, Statistic, Tooltip } from 'antd';
import {
  CompassOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  UserAddOutlined,
  MailOutlined,
  EyeOutlined,
} from '@ant-design/icons';

interface TrafficOverviewSummary {
  highIntentVisitors: number;
  highIntentVisitorRate: number;
  activatedUsers: number;
  activatedUserRate: number;
  effectiveNewUsers: number;
  effectiveNewUserRate: number;
}

interface TrafficBehaviorFunnelOverview {
  visits: number;
  registrations: number;
  verifiedUsers: number;
  productViewReadyUsers: number;
  actionReadyUsers: number;
  effectiveUsers: number;
  visitToRegistrationRate: number;
  registrationToVerificationRate: number;
  verificationToProductViewRate: number;
  productViewToEffectiveRate: number;
  blockers: {
    anonymousOrUnregisteredVisits: number;
    unverifiedUsers: number;
    insufficientProductViews: number;
    missingAction: number;
  };
}

function percent(value: number): string {
  return `${value}%`;
}

function stageSuffix(label: string, value: number | undefined): string {
  return `(${label} ${percent(value || 0)})`;
}

export default function BehaviorFunnelCards({
  overview,
  data,
}: {
  overview: TrafficOverviewSummary | null;
  data: TrafficBehaviorFunnelOverview | null;
}) {
  return (
    <>
      <Card className="mb-6">
        <div className="text-sm text-gray-600">
          这个视图只保留可信诊断，不再把访客、已识别用户和新注册用户强行拼成一条假漏斗。
        </div>
        <div className="mt-2 text-sm text-gray-500">
          高意向访客按访客统计，允许匿名；激活用户按已识别用户统计，不限制注册时间；有效新用户只看当前窗口内新注册并完成深度激活的用户。
        </div>
      </Card>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title={
                <Tooltip title="当前时间窗内浏览至少 3 个不同商品，且至少发生一次强意向动作的访客，允许匿名。">
                  <span>高意向访客</span>
                </Tooltip>
              }
              value={overview?.highIntentVisitors || 0}
              prefix={<CompassOutlined />}
              suffix={stageSuffix('访客意向率', overview?.highIntentVisitorRate)}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title={
                <Tooltip title="当前时间窗内完成深度行为的已识别用户，不限制是否在本窗口注册。">
                  <span>激活用户</span>
                </Tooltip>
              }
              value={overview?.activatedUsers || 0}
              prefix={<RocketOutlined />}
              suffix={stageSuffix('用户激活率', overview?.activatedUserRate)}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title={
                <Tooltip title="当前时间窗内新注册、已验邮箱、浏览至少 3 个不同商品，且至少发生一次收藏或购买外跳的用户。">
                  <span>有效新用户</span>
                </Tooltip>
              }
              value={overview?.effectiveNewUsers || 0}
              prefix={<SafetyCertificateOutlined />}
              suffix={stageSuffix('新用户激活率', overview?.effectiveNewUserRate)}
              valueStyle={{ color: '#eb2f96' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        className="mb-6"
        title="有效新用户形成路径"
        extra={
          <span className="text-xs text-gray-400">
            这条路径只解释当前窗口的新注册用户，保留真正单调递减的阶段
          </span>
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="注册用户"
                value={data?.registrations || 0}
                prefix={<UserAddOutlined />}
                suffix={stageSuffix('访问->注册', data?.visitToRegistrationRate)}
                valueStyle={{ color: '#13c2c2' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="已验邮箱"
                value={data?.verifiedUsers || 0}
                prefix={<MailOutlined />}
                suffix={stageSuffix('注册->验邮', data?.registrationToVerificationRate)}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="浏览达标"
                value={data?.productViewReadyUsers || 0}
                prefix={<EyeOutlined />}
                suffix={stageSuffix('验邮->浏览达标', data?.verificationToProductViewRate)}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="有效新用户"
                value={data?.effectiveUsers || 0}
                prefix={<SafetyCertificateOutlined />}
                suffix={stageSuffix('浏览达标->有效', data?.productViewToEffectiveRate)}
                valueStyle={{ color: '#eb2f96' }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Card
        className="mb-6"
        title="并行诊断信号"
        extra={<span className="text-xs text-gray-400">这些信号用于解释阻塞点，不按顺序组成漏斗</span>}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small">
              <Statistic
                title="动作达标"
                value={data?.actionReadyUsers || 0}
                prefix={<RocketOutlined />}
                valueStyle={{ color: '#1677ff' }}
              />
              <div className="mt-2 text-xs text-gray-500">
                当前窗口内已发生收藏或购买外跳的新注册用户。它是并行诊断信号，不要求先进入浏览达标集合。
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={16}>
            <Card size="small">
              <div className="text-sm text-gray-600">
                当“动作达标”大于“浏览达标”时，不代表链路倒流，而是说明一部分新注册用户发生了动作，但没有满足“至少浏览 3 个不同商品”的严格阈值。
              </div>
              <div className="mt-2 text-xs text-gray-500">
                这也是当前视图改名为“行为诊断”的原因：它解释阻塞点和行为层次，不再把所有对象强行画成一条严格漏斗。
              </div>
            </Card>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="未注册访问"
              value={data?.blockers.anonymousOrUnregisteredVisits || 0}
              valueStyle={{ color: '#fa8c16' }}
            />
            <div className="mt-2 text-xs text-gray-500">访问发生了，但没有进入注册链路。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="待验邮箱"
              value={data?.blockers.unverifiedUsers || 0}
              valueStyle={{ color: '#faad14' }}
            />
            <div className="mt-2 text-xs text-gray-500">注册已发生，但没有完成邮箱验证。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="浏览深度不足"
              value={data?.blockers.insufficientProductViews || 0}
              valueStyle={{ color: '#722ed1' }}
            />
            <div className="mt-2 text-xs text-gray-500">已验邮箱用户尚未达到 3 个不同商品浏览。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="缺少动作"
              value={data?.blockers.missingAction || 0}
              valueStyle={{ color: '#1677ff' }}
            />
            <div className="mt-2 text-xs text-gray-500">浏览达标后仍未发生收藏或购买外跳。</div>
          </Card>
        </Col>
      </Row>
    </>
  );
}
