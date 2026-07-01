'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Row, Col, DatePicker, Table, Progress, Tag } from 'antd';
import { ShareAltOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import { get } from '@/lib/api';
import { EmptyState } from '../../components/EmptyState';
import { DashboardSkeleton } from '../../components/PageSkeleton';
import { readSessionCache, writeSessionCache } from '@/lib/session-cache';

const { RangePicker } = DatePicker;
const REFERRALS_ANALYTICS_CACHE_TTL_MS = 5 * 60 * 1000;
const LazyLineChart = dynamic(() => import('@/components/charts/LineChart'), {
  loading: () => <div className="h-[300px] animate-pulse rounded bg-gray-50" />,
});

interface ReferralsData {
  byDate: { date: string; count: number }[];
  topReferrers: {
    code: string;
    ownerId: string;
    clicks: number;
    rawClicks: number;
    conversions: number;
    uniqueSessions: number;
    uniqueBrowserIds?: number;
    uniqueIps: number;
    landingVisits: number;
    strictLandingVisits?: number;
    strictMatchedClicks?: number;
    carryoverLandingVisits?: number;
    firstPartyVisits: number;
    gaCaptures: number;
    consentAccepted: number;
    consentRejected: number;
    consentPending: number;
    consentDecisionRate: number;
    gaCaptureRate: number;
    registrations: number;
    verifiedRegistrations: number;
    suspiciousClicks: number;
    emptyRefererClicks: number;
    suspiciousClickRate: number;
    clickToLandingRate: number;
    landingToRegistrationRate: number;
    riskLevel: 'low' | 'medium' | 'high';
    riskReasons: string[];
  }[];
  funnel: {
    steps: {
      clicks: number;
      registrations: number;
      activatedConversions: number;
      emailVerified: number;
      productViewsReady: number;
      actionReady: number;
      validConversions: number;
    };
    trafficQuality: {
      trustedClicks: number;
      registrationsInWindow: number;
      sameWindowRegistrationRate: number;
      metricType: 'date_window_snapshot';
    };
    conversionCohort: {
      registrations: number;
      emailVerified: number;
      productViewsReady: number;
      actionReady: number;
      activatedConversions: number;
      validConversions: number;
      activationRate: number;
      settlementRate: number;
      metricType: 'registration_cohort';
    };
    blockers: {
      emailVerification: number;
      productViews: number;
      favoriteOrPurchase: number;
      riskReview: number;
    };
    layers: {
      registration: {
        eligible: number;
        converted: number;
        conversionRate: number;
        blockers: {
          notRegistered: number;
        };
      };
      activation: {
        eligible: number;
        converted: number;
        conversionRate: number;
        blockers: {
          emailVerification: number;
          productViews: number;
        };
      };
      rewardSettlement: {
        eligible: number;
        converted: number;
        conversionRate: number;
        blockers: {
          favoriteOrPurchase: number;
          riskReview: number;
        };
      };
    };
  };
  experiment: {
    experimentKey: string;
    metrics: {
      variantId: 'control' | 'rewards_push';
      exposures: number;
      copies: number;
      shares: number;
      validConversions: number;
      copyRate: number;
      shareRate: number;
      conversionRate: number;
    }[];
  };
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function riskColor(level: 'low' | 'medium' | 'high'): string {
  if (level === 'high') return 'red';
  if (level === 'medium') return 'orange';
  return 'green';
}

export default function ReferralsAnalyticsPage() {
  const { isReady } = useAdminAuthReady();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);
  const [data, setData] = useState<ReferralsData | null>(null);
  const [alerts, setAlerts] = useState<
    Array<{
      id: string;
      severity: 'medium' | 'high';
      title: string;
      description: string;
      reasons: string[];
      type: 'referral' | 'product';
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const cacheKey = useMemo(
    () =>
      `admin:analytics:referrals:${dateRange[0].format('YYYY-MM-DD')}:${dateRange[1].format('YYYY-MM-DD')}`,
    [dateRange],
  );

  useEffect(() => {
    const cached = readSessionCache<ReferralsData>(
      cacheKey,
      REFERRALS_ANALYTICS_CACHE_TTL_MS,
    );
    if (!cached) return;

    setData(cached);
    setLoading(false);
  }, [cacheKey]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = dateRange[0].startOf('day').toISOString();
      const endDate = dateRange[1].endOf('day').toISOString();
      const result = await get<ReferralsData>('/admin/analytics/referrals', {
        startDate,
        endDate,
      });
      setData(result);
      writeSessionCache(cacheKey, result);
    } catch {
      // 加载失败时显示空状态
    } finally {
      setLoading(false);
    }
  }, [cacheKey, dateRange]);

  useEffect(() => {
    if (!isReady) return;
    fetchData();
  }, [fetchData, isReady]);

  useEffect(() => {
    if (!isReady) return;
    const startDate = dateRange[0].startOf('day').toISOString();
    const endDate = dateRange[1].endOf('day').toISOString();
    get<{
      alerts?: Array<{
        id: string;
        severity: 'medium' | 'high';
        title: string;
        description: string;
        reasons: string[];
        type: 'referral' | 'product';
      }>;
    }>('/admin/analytics/alerts', {
      startDate,
      endDate,
    })
      .then((result) => {
        const referralAlerts = (result.alerts || []).filter(
          (alert) => alert.type === 'referral',
        );
        setAlerts(referralAlerts);
      })
      .catch(() => {
        setAlerts([]);
      });
  }, [dateRange, isReady]);

  const columns = useMemo(
    () => [
      { title: '推荐码', dataIndex: 'code', key: 'code', fixed: 'left' as const, width: 110 },
      { title: '用户 ID', dataIndex: 'ownerId', key: 'ownerId', width: 280 },
      { title: '可信点击', dataIndex: 'clicks', key: 'clicks', sorter: (a: ReferralsData['topReferrers'][number], b: ReferralsData['topReferrers'][number]) => a.clicks - b.clicks },
      { title: '原始点击', dataIndex: 'rawClicks', key: 'rawClicks', sorter: (a: ReferralsData['topReferrers'][number], b: ReferralsData['topReferrers'][number]) => a.rawClicks - b.rawClicks },
      {
        title: '唯一浏览器 ID',
        dataIndex: 'uniqueBrowserIds',
        key: 'uniqueBrowserIds',
        render: (_value: number, row: ReferralsData['topReferrers'][number]) =>
          row.uniqueBrowserIds ?? row.uniqueSessions,
      },
      { title: '唯一 IP', dataIndex: 'uniqueIps', key: 'uniqueIps' },
      { title: '归因落地', dataIndex: 'landingVisits', key: 'landingVisits' },
      {
        title: '严格落地',
        dataIndex: 'strictLandingVisits',
        key: 'strictLandingVisits',
        render: (_value: number, row: ReferralsData['topReferrers'][number]) =>
          row.strictLandingVisits ?? row.landingVisits,
      },
      {
        title: '回访落地',
        dataIndex: 'carryoverLandingVisits',
        key: 'carryoverLandingVisits',
        render: (_value: number, row: ReferralsData['topReferrers'][number]) =>
          row.carryoverLandingVisits ?? 0,
      },
      { title: '待同意', dataIndex: 'consentPending', key: 'consentPending' },
      { title: '已拒绝', dataIndex: 'consentRejected', key: 'consentRejected' },
      {
        title: '同意决策率',
        dataIndex: 'consentDecisionRate',
        key: 'consentDecisionRate',
        render: formatPercent,
      },
      {
        title: 'GA 捕获率',
        dataIndex: 'gaCaptureRate',
        key: 'gaCaptureRate',
        render: formatPercent,
      },
      { title: '注册', dataIndex: 'registrations', key: 'registrations' },
      { title: '已验邮箱', dataIndex: 'verifiedRegistrations', key: 'verifiedRegistrations' },
      { title: '有效转化', dataIndex: 'conversions', key: 'conversions' },
      { title: '脚本 UA', dataIndex: 'suspiciousClicks', key: 'suspiciousClicks' },
      {
        title: '严格可回溯点击率',
        dataIndex: 'clickToLandingRate',
        key: 'clickToLandingRate',
        render: formatPercent,
      },
      {
        title: '落地->注册率',
        dataIndex: 'landingToRegistrationRate',
        key: 'landingToRegistrationRate',
        render: formatPercent,
      },
      {
        title: '风险等级',
        dataIndex: 'riskLevel',
        key: 'riskLevel',
        render: (value: 'low' | 'medium' | 'high') => (
          <Tag color={riskColor(value)}>
            {value === 'high' ? '高风险' : value === 'medium' ? '中风险' : '低风险'}
          </Tag>
        ),
      },
      {
        title: '风险信号',
        dataIndex: 'riskReasons',
        key: 'riskReasons',
        width: 280,
        render: (value: string[]) => value.length > 0 ? value.join(' / ') : '正常',
      },
    ],
    [],
  );

  const funnelLayerCards = useMemo(
    () =>
      data
        ? [
            {
              key: 'registration',
              title: '同窗注册归因',
              description:
                '所选日期窗口内，可信点击最终带来注册归因的人数。这是点击窗口快照，不等同于注册后续 cohort。',
              eligibleLabel: '可信点击',
              convertedLabel: '当期注册归因',
              tone: '#3b82f6',
              eligible: data.funnel.layers.registration.eligible,
              converted: data.funnel.layers.registration.converted,
              conversionRate: data.funnel.layers.registration.conversionRate,
              blockers: [
                {
                  key: 'notRegistered',
                  label: '点击后未注册',
                  count: data.funnel.layers.registration.blockers.notRegistered,
                },
              ],
            },
            {
              key: 'activation',
              title: '注册后激活',
              description:
                '以所选日期窗口内的注册归因用户为起点，统计完成验邮并浏览至少 3 个不同商品的人数。',
              eligibleLabel: '当期注册归因',
              convertedLabel: '已激活',
              tone: '#10b981',
              eligible: data.funnel.layers.activation.eligible,
              converted: data.funnel.layers.activation.converted,
              conversionRate: data.funnel.layers.activation.conversionRate,
              blockers: [
                {
                  key: 'emailVerification',
                  label: '未验证邮箱',
                  count: data.funnel.layers.activation.blockers.emailVerification,
                },
                {
                  key: 'productViews',
                  label: '浏览商品不足 3 个',
                  count: data.funnel.layers.activation.blockers.productViews,
                },
              ],
            },
            {
              key: 'rewardSettlement',
              title: '激活后结算',
              description:
                '以当期已激活用户为起点，统计满足结算条件并最终记为有效奖励的人数。',
              eligibleLabel: '已激活',
              convertedLabel: '已结算',
              tone: '#f97316',
              eligible: data.funnel.layers.rewardSettlement.eligible,
              converted: data.funnel.layers.rewardSettlement.converted,
              conversionRate: data.funnel.layers.rewardSettlement.conversionRate,
              blockers: [
                {
                  key: 'favoriteOrPurchase',
                  label: '未收藏 / 未点击购买',
                  count: data.funnel.layers.rewardSettlement.blockers.favoriteOrPurchase,
                },
                {
                  key: 'riskReview',
                  label: '其他待核查',
                  count: data.funnel.layers.rewardSettlement.blockers.riskReview,
                },
              ],
            },
          ]
        : [],
    [data],
  );

  const experimentColumns = useMemo(
    () => [
      {
        title: '实验组',
        dataIndex: 'variantId',
        key: 'variantId',
        render: (value: 'control' | 'rewards_push') => (
          <Tag color={value === 'control' ? 'blue' : 'orange'}>
            {value === 'control' ? 'Control' : 'Rewards Push'}
          </Tag>
        ),
      },
      { title: '曝光', dataIndex: 'exposures', key: 'exposures' },
      { title: '复制链接', dataIndex: 'copies', key: 'copies' },
      { title: '分享', dataIndex: 'shares', key: 'shares' },
      { title: '有效转化', dataIndex: 'validConversions', key: 'validConversions' },
      {
        title: '复制率',
        dataIndex: 'copyRate',
        key: 'copyRate',
        render: formatPercent,
      },
      {
        title: '分享率',
        dataIndex: 'shareRate',
        key: 'shareRate',
        render: formatPercent,
      },
      {
        title: '转化率',
        dataIndex: 'conversionRate',
        key: 'conversionRate',
        render: (value: number) => `${(value * 100).toFixed(2)}%`,
      },
    ],
    [],
  );

  const diagnosticsSummary = useMemo(() => {
    const rows = data?.topReferrers || [];
    return rows.reduce(
      (summary, row) => ({
        rawClicks: summary.rawClicks + row.rawClicks,
        trustedClicks: summary.trustedClicks + row.clicks,
        uniqueBrowserIds:
          summary.uniqueBrowserIds +
          (row.uniqueBrowserIds ?? row.uniqueSessions),
        landingVisits: summary.landingVisits + row.landingVisits,
        strictLandingVisits:
          summary.strictLandingVisits +
          (row.strictLandingVisits ?? row.landingVisits),
        carryoverLandingVisits:
          summary.carryoverLandingVisits + (row.carryoverLandingVisits ?? 0),
        firstPartyVisits: summary.firstPartyVisits + row.firstPartyVisits,
        gaCaptures: summary.gaCaptures + row.gaCaptures,
        consentAccepted: summary.consentAccepted + row.consentAccepted,
        consentRejected: summary.consentRejected + row.consentRejected,
        consentPending: summary.consentPending + row.consentPending,
        suspiciousClicks: summary.suspiciousClicks + row.suspiciousClicks,
        verifiedRegistrations:
          summary.verifiedRegistrations + row.verifiedRegistrations,
        highRiskCodes:
          summary.highRiskCodes + (row.riskLevel === 'high' ? 1 : 0),
      }),
      {
        rawClicks: 0,
        trustedClicks: 0,
        uniqueBrowserIds: 0,
        landingVisits: 0,
        strictLandingVisits: 0,
        carryoverLandingVisits: 0,
        firstPartyVisits: 0,
        gaCaptures: 0,
        consentAccepted: 0,
        consentRejected: 0,
        consentPending: 0,
        suspiciousClicks: 0,
        verifiedRegistrations: 0,
        highRiskCodes: 0,
      },
    );
  }, [data]);

  const consentDiagnosticsSummary = useMemo(() => {
    const firstPartyVisits = diagnosticsSummary.firstPartyVisits;
    const consentResolved =
      diagnosticsSummary.consentAccepted + diagnosticsSummary.consentRejected;

    return {
      firstPartyVisits,
      consentAccepted: diagnosticsSummary.consentAccepted,
      consentRejected: diagnosticsSummary.consentRejected,
      consentPending: diagnosticsSummary.consentPending,
      gaCaptures: diagnosticsSummary.gaCaptures,
      consentDecisionRate:
        firstPartyVisits > 0 ? consentResolved / firstPartyVisits : 0,
      gaCaptureRate:
        firstPartyVisits > 0
          ? diagnosticsSummary.gaCaptures / firstPartyVisits
          : 0,
    };
  }, [diagnosticsSummary]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">推荐码统计</h1>
        <RangePicker
          value={dateRange}
          onChange={(dates) =>
            dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])
          }
        />
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <Row gutter={[16, 16]}>
          {alerts.length > 0 ? (
            <Col span={24}>
              <Card title="自动告警">
                <div className="mb-3 text-xs text-gray-500">
                  按当前所选日期范围生成的推荐码异常快照
                </div>
                <div className="space-y-3">
                  {alerts.slice(0, 3).map((alert) => (
                    <div
                      key={alert.id}
                      className={`rounded-xl border px-4 py-3 ${
                        alert.severity === 'high'
                          ? 'border-red-200 bg-red-50'
                          : 'border-amber-200 bg-amber-50'
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <Tag color={alert.severity === 'high' ? 'red' : 'orange'}>
                          {alert.severity === 'high' ? '高优先级' : '中优先级'}
                        </Tag>
                        <span className="font-medium text-gray-900">{alert.title}</span>
                      </div>
                      <div className="text-sm text-gray-700">{alert.description}</div>
                      {alert.reasons.length > 0 ? (
                        <div className="mt-1 text-xs text-gray-500">
                          {alert.reasons.join(' / ')}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
          ) : null}
          <Col span={24}>
            <Card title="流量质量快照">
              <div className="mb-3 text-xs text-gray-500">
                这一块按所选日期窗口直接统计点击与注册归因，只回答“这段时间的流量质量如何”，不代表注册用户后续一定已走完激活或结算。
              </div>
              <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <MetricCard
                  label="可信点击"
                  value={data?.funnel.trafficQuality.trustedClicks || 0}
                />
                <MetricCard
                  label="当期注册归因"
                  value={data?.funnel.trafficQuality.registrationsInWindow || 0}
                />
                <MetricCard
                  label="同窗注册率"
                  value={
                    data?.funnel.trafficQuality.sameWindowRegistrationRate || 0
                  }
                  format="percent"
                />
                <MetricCard
                  label="未注册点击"
                  value={
                    data?.funnel.layers.registration.blockers.notRegistered || 0
                  }
                />
              </div>
            </Card>
          </Col>
          <Col span={24}>
            <Card title="注册后转化漏斗">
              <div className="mb-3 text-xs text-gray-500">
                这一块以所选日期窗口内的注册归因用户为 cohort 起点，后续展示验邮、浏览达标、激活和结算进度，所以它和上面的点击快照不是同一个分母。
              </div>
              <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
                <MetricCard
                  label="当期注册归因"
                  value={data?.funnel.conversionCohort.registrations || 0}
                />
                <MetricCard
                  label="邮箱验证"
                  value={data?.funnel.conversionCohort.emailVerified || 0}
                />
                <MetricCard
                  label="浏览达标"
                  value={data?.funnel.conversionCohort.productViewsReady || 0}
                />
                <MetricCard
                  label="动作达标"
                  value={data?.funnel.conversionCohort.actionReady || 0}
                />
                <MetricCard
                  label="激活转化"
                  value={
                    data?.funnel.conversionCohort.activatedConversions || 0
                  }
                />
                <MetricCard
                  label="奖励结算"
                  value={data?.funnel.conversionCohort.validConversions || 0}
                />
              </div>
            </Card>
          </Col>
          <Col span={24}>
            <div className="grid gap-4 xl:grid-cols-3">
              {funnelLayerCards.map((layer) => (
                <FunnelLayerCard
                  key={layer.key}
                  title={layer.title}
                  description={layer.description}
                  eligibleLabel={layer.eligibleLabel}
                  convertedLabel={layer.convertedLabel}
                  eligible={layer.eligible}
                  converted={layer.converted}
                  conversionRate={layer.conversionRate}
                  blockers={layer.blockers}
                  tone={layer.tone}
                />
              ))}
            </div>
          </Col>
          <Col span={24}>
            <Card title="推荐点击趋势">
              <LazyLineChart data={data?.byDate || []} height={300} />
            </Card>
          </Col>
          <Col span={24}>
            <Card title="Consent / GA 诊断（当前 Top 10）">
              <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
                <MetricCard
                  label="首方访问"
                  value={consentDiagnosticsSummary.firstPartyVisits}
                />
                <MetricCard
                  label="已同意"
                  value={consentDiagnosticsSummary.consentAccepted}
                />
                <MetricCard
                  label="待同意"
                  value={consentDiagnosticsSummary.consentPending}
                />
                <MetricCard
                  label="已拒绝"
                  value={consentDiagnosticsSummary.consentRejected}
                />
                <MetricCard
                  label="同意完成率"
                  value={consentDiagnosticsSummary.consentDecisionRate}
                  format="percent"
                />
                <MetricCard
                  label="GA 捕获率"
                  value={consentDiagnosticsSummary.gaCaptureRate}
                  format="percent"
                />
              </div>
            </Card>
          </Col>
          <Col span={24}>
            <Card title="反作弊快照（当前 Top 10）">
              <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
                <MetricCard label="可信点击" value={diagnosticsSummary.trustedClicks} />
                <MetricCard label="原始点击" value={diagnosticsSummary.rawClicks} />
                <MetricCard label="唯一浏览器 ID" value={diagnosticsSummary.uniqueBrowserIds} />
                <MetricCard label="严格落地" value={diagnosticsSummary.strictLandingVisits} />
                <MetricCard label="回访落地" value={diagnosticsSummary.carryoverLandingVisits} />
                <MetricCard label="脚本 UA" value={diagnosticsSummary.suspiciousClicks} />
              </div>
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card title="A/B Test — Referral Rewards">
              <Table
                dataSource={data?.experiment.metrics || []}
                columns={experimentColumns}
                rowKey="variantId"
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
          <Col span={24}>
            <Card title="推荐排行榜 Top 10">
              <div className="mb-3 text-xs text-gray-500">
                严格落地仅统计在所选时间范围内可由 <code>ref_click_id</code> 回溯到点击事件的访问次数。
                严格可回溯点击率的分母是可信点击，分子是至少带来 1 次严格落地的可信点击数。
                回访落地表示带着历史推荐归因 cookie 回站的访问，不参与严格可回溯点击率。
              </div>
              <Table
                dataSource={data?.topReferrers || []}
                columns={columns}
                rowKey="code"
                scroll={{ x: 1600 }}
                locale={{
                  emptyText: (
                    <EmptyState
                      icon={<ShareAltOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                      title="暂无推荐数据"
                      description="选定时间范围内暂无推荐码记录"
                    />
                  ),
                }}
                pagination={false}
              />
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  format = 'number',
}: {
  label: string;
  value: number;
  format?: 'number' | 'percent';
}) {
  const displayValue =
    format === 'percent' ? `${(value * 100).toFixed(1)}%` : value;

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{displayValue}</p>
    </div>
  );
}

function FunnelLayerCard({
  title,
  description,
  eligibleLabel,
  convertedLabel,
  eligible,
  converted,
  conversionRate,
  blockers,
  tone,
}: {
  title: string;
  description: string;
  eligibleLabel: string;
  convertedLabel: string;
  eligible: number;
  converted: number;
  conversionRate: number;
  blockers: Array<{ key: string; label: string; count: number }>;
  tone: string;
}) {
  return (
    <Card title={title}>
      <p className="mb-4 text-sm text-gray-500">{description}</p>
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label={eligibleLabel} value={eligible} />
        <MetricCard label={convertedLabel} value={converted} />
        <MetricCard label="转化率" value={conversionRate} format="percent" />
      </div>
      <div className="mt-5 space-y-4">
        {blockers.map((blocker) => (
          <div key={blocker.key}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span>{blocker.label}</span>
              <span className="font-semibold">{blocker.count}</span>
            </div>
            <Progress
              percent={eligible ? Math.round((blocker.count / eligible) * 100) : 0}
              showInfo={false}
              strokeColor={tone}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
