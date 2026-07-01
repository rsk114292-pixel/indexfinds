'use client';

import { Card, Col, Row, Statistic, Tooltip } from 'antd';
import {
  LinkOutlined,
  TagOutlined,
  GlobalOutlined,
  CompassOutlined,
  ShareAltOutlined,
  MobileOutlined,
  WarningOutlined,
} from '@ant-design/icons';

interface AttributionQualityOverview {
  totalVisits: number;
  attributedVisits: number;
  attributedRate: number;
  utmTaggedVisits: number;
  utmCoverageRate: number;
  referrerTaggedVisits: number;
  referrerCoverageRate: number;
  directVisits: number;
  directRate: number;
  referralShareUnattributedVisits: number;
  referralShareUnattributedRate: number;
  webviewReferrerLossVisits: number;
  webviewReferrerLossRate: number;
  likelyAutomatedDirectVisits: number;
  likelyAutomatedDirectRate: number;
}

export default function AttributionOverviewCards({
  data,
}: {
  data: AttributionQualityOverview | null;
}) {
  return (
    <Row gutter={[16, 16]} className="mb-6">
      <Col xs={24} sm={12} lg={8} xl={4}>
        <Card>
          <Statistic
            title={
              <Tooltip title="排除站内回流后的去重访问，是归因质量页的总样本。">
                <span>归因范围访问</span>
              </Tooltip>
            }
            value={data?.totalVisits || 0}
            prefix={<LinkOutlined />}
            valueStyle={{ color: '#1677ff' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={8} xl={4}>
        <Card>
          <Statistic
            title={
              <Tooltip title="明确带有 UTM 或外部 referrer 的访问。">
                <span>可识别来源</span>
              </Tooltip>
            }
            value={data?.attributedVisits || 0}
            suffix={data ? `(${data.attributedRate}%)` : undefined}
            prefix={<TagOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={8} xl={4}>
        <Card>
          <Statistic
            title="UTM 覆盖"
            value={data?.utmTaggedVisits || 0}
            suffix={data ? `(${data.utmCoverageRate}%)` : undefined}
            prefix={<TagOutlined />}
            valueStyle={{ color: '#13c2c2' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={8} xl={4}>
        <Card>
          <Statistic
            title="Referrer 覆盖"
            value={data?.referrerTaggedVisits || 0}
            suffix={data ? `(${data.referrerCoverageRate}%)` : undefined}
            prefix={<GlobalOutlined />}
            valueStyle={{ color: '#722ed1' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={8} xl={4}>
        <Card>
          <Statistic
            title={
              <Tooltip title="无 UTM 且无外部 Referrer，不等于用户手动输入网址。">
                <span>直接/未归因访问</span>
              </Tooltip>
            }
            value={data?.directVisits || 0}
            suffix={data ? `(${data.directRate}%)` : undefined}
            prefix={<CompassOutlined />}
            valueStyle={{ color: '#fa8c16' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={8} xl={4}>
        <Card>
          <Statistic
            title="推荐分享缺来源"
            value={data?.referralShareUnattributedVisits || 0}
            suffix={data ? `(${data.referralShareUnattributedRate}%)` : undefined}
            prefix={<ShareAltOutlined />}
            valueStyle={{ color: '#eb2f96' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={8} xl={4}>
        <Card>
          <Statistic
            title="WebView 丢来源"
            value={data?.webviewReferrerLossVisits || 0}
            suffix={data ? `(${data.webviewReferrerLossRate}%)` : undefined}
            prefix={<MobileOutlined />}
            valueStyle={{ color: '#fa541c' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={8} xl={4}>
        <Card>
          <Statistic
            title="疑似自动化 Direct"
            value={data?.likelyAutomatedDirectVisits || 0}
            suffix={data ? `(${data.likelyAutomatedDirectRate}%)` : undefined}
            prefix={<WarningOutlined />}
            valueStyle={{ color: '#cf1322' }}
          />
        </Card>
      </Col>
    </Row>
  );
}
