'use client';

import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  AppstoreOutlined,
  BranchesOutlined,
  RiseOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import { Card, Col, Row, Statistic, Tooltip } from 'antd';
import type { ClicksData } from '../types';

function ChangeIndicator({
  value,
  prevValue,
}: {
  value: number;
  prevValue: number;
}) {
  if (prevValue === 0 && value === 0) {
    return <span className="text-gray-400 text-xs">-</span>;
  }

  const change =
    prevValue === 0 ? 100 : Math.round(((value - prevValue) / prevValue) * 100);
  const isPositive = change >= 0;

  return (
    <Tooltip title={`上期: ${prevValue}`}>
      <span className={`text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
        {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
        {Math.abs(change)}%
      </span>
    </Tooltip>
  );
}

interface ClicksSummaryCardsProps {
  summary?: ClicksData['summary'];
}

export default function ClicksSummaryCards({
  summary,
}: ClicksSummaryCardsProps) {
  const current = summary ?? {
    total: 0,
    rawTotal: 0,
    productIntentTotal: 0,
    productIntentChange: 0,
    prevProductIntentTotal: 0,
    platformSelectionTotal: 0,
    platformSelectionChange: 0,
    prevPlatformSelectionTotal: 0,
    platformSelectionRate: 0,
    multiPlatformIntentCount: 0,
    multiPlatformIntentChange: 0,
    prevMultiPlatformIntentCount: 0,
    multiPlatformIntentRate: 0,
    suspiciousClicks: 0,
    suspiciousRate: 0,
    totalChange: 0,
    uniqueProducts: 0,
    uniqueProductsChange: 0,
    prevTotal: 0,
    prevRawTotal: 0,
    prevUniqueProducts: 0,
  };

  return (
    <Row gutter={[16, 16]} className="mb-6">
      <Col xs={24} sm={12} lg={8} xl={4}>
        <Card>
          <Statistic
            title={(
              <div className="flex items-center justify-between">
                <span>购买意图</span>
                <ChangeIndicator
                  value={current.productIntentTotal}
                  prevValue={current.prevProductIntentTotal}
                />
              </div>
            )}
            value={current.productIntentTotal}
            prefix={<ShoppingOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
          <div className="mt-2 text-xs text-gray-400">
            用户 + 商品 + 10 分钟
          </div>
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={8} xl={4}>
        <Card>
          <Statistic
            title={(
              <div className="flex items-center justify-between">
                <span>平台选择</span>
                <ChangeIndicator
                  value={current.platformSelectionTotal}
                  prevValue={current.prevPlatformSelectionTotal}
                />
              </div>
            )}
            value={current.platformSelectionTotal}
            prefix={<RiseOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
          <div className="mt-2 text-xs text-gray-400">
            平均 {(current.platformSelectionRate / 100).toFixed(2)} 个平台 / 意图
          </div>
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={8} xl={4}>
        <Card>
          <Statistic
            title={(
              <div className="flex items-center justify-between">
                <span>多平台比较</span>
                <ChangeIndicator
                  value={current.multiPlatformIntentCount}
                  prevValue={current.prevMultiPlatformIntentCount}
                />
              </div>
            )}
            value={current.multiPlatformIntentCount}
            suffix={`(${current.multiPlatformIntentRate}%)`}
            prefix={<BranchesOutlined />}
            valueStyle={{ color: '#722ed1' }}
          />
          <div className="mt-2 text-xs text-gray-400">同一意图选择 2+ 平台</div>
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={8} xl={4}>
        <Card>
          <Statistic
            title={(
              <div className="flex items-center justify-between">
                <span>原始外跳事件</span>
                <ChangeIndicator
                  value={current.rawTotal}
                  prevValue={current.prevRawTotal}
                />
              </div>
            )}
            value={current.rawTotal}
            prefix={<AppstoreOutlined />}
            valueStyle={{ color: '#8c8c8c' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={8} xl={4}>
        <Card>
          <Statistic
            title="重复/过滤事件"
            value={current.suspiciousClicks}
            suffix={`(${current.suspiciousRate}%)`}
            prefix={<RiseOutlined />}
            valueStyle={{ color: '#ff4d4f' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={8} xl={4}>
        <Card>
          <Statistic
            title={(
              <div className="flex items-center justify-between">
                <span>外跳商品数</span>
                <ChangeIndicator
                  value={current.uniqueProducts}
                  prevValue={current.prevUniqueProducts}
                />
              </div>
            )}
            value={current.uniqueProducts}
            prefix={<ShoppingOutlined />}
            valueStyle={{ color: '#fa8c16' }}
          />
        </Card>
      </Col>
    </Row>
  );
}
