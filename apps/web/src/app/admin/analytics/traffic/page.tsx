'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Row, Col, DatePicker, Button, App, Alert, Segmented } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import { get } from '@/lib/api';
import { DashboardSkeleton } from '../../components/PageSkeleton';
import SourceTable from './components/SourceTable';
import CampaignTable from './components/CampaignTable';
import LandingPageTable from './components/LandingPageTable';
import ActionTaskBoard, {
  type TrafficExecutionTask,
} from './components/ActionTaskBoard';
import GrowthBriefPanel, {
  type GrowthBriefReport,
} from './components/GrowthBriefPanel';
import BehaviorFunnelCards from './components/BehaviorFunnelCards';
import AttributionOverviewCards from './components/AttributionOverviewCards';
import EngagementOverviewCards, {
  type TrafficEngagementOverview,
} from './components/EngagementOverviewCards';
import DirectBreakdownTable from './components/DirectBreakdownTable';
import SourceQualityDiagnosticsPanel from './components/SourceQualityDiagnosticsPanel';
import CaptureDiagnosticsCards from './components/CaptureDiagnosticsCards';
import CaptureLossTable from './components/CaptureLossTable';
import CaptureBreakdownTable, {
  type CaptureBreakdownDimension,
} from './components/CaptureBreakdownTable';
import MetricGlossaryModal from './components/MetricGlossaryModal';
import ReconciliationFunnelCards from './components/ReconciliationFunnelCards';
import {
  channelLabels,
  formatDirectReasonLabel,
  formatTrafficSourceLabel,
} from './components/traffic-labels';
import {
  formatPercent,
  getTrafficAction,
  getOutboundVisitCount,
  getTrafficOpportunityScore,
  getTrafficRiskLabel,
  getVisitToOutboundRate,
} from './components/traffic-scoring';
import { readSessionCache, writeSessionCache } from '@/lib/session-cache';

const { RangePicker } = DatePicker;
const TRAFFIC_ANALYTICS_CACHE_TTL_MS = 5 * 60 * 1000;
const OPTIONAL_DIAGNOSTIC_TIMEOUT_MS = 8000;
const chartSkeleton = () => <div className="h-[300px] animate-pulse rounded bg-gray-50" />;
const overviewSkeleton = () => <div className="h-[144px] animate-pulse rounded bg-gray-50" />;
const LazyTrafficOverviewCards = dynamic(() => import('./components/TrafficOverviewCards'), {
  loading: overviewSkeleton,
});
const LazyChannelPieChart = dynamic(() => import('./components/ChannelPieChart'), {
  loading: chartSkeleton,
});
const LazyTrafficTrendChart = dynamic(() => import('./components/TrafficTrendChart'), {
  loading: chartSkeleton,
});
const LazyGeoDistribution = dynamic(() => import('./components/GeoDistribution'), {
  loading: chartSkeleton,
});
const LazyDeviceBreakdown = dynamic(() => import('./components/DeviceBreakdown'), {
  loading: chartSkeleton,
});

async function optionalDiagnostic<T>(
  requestFactory: (signal: AbortSignal) => Promise<T>,
  fallback: T,
  timeoutMs = OPTIONAL_DIAGNOSTIC_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      resolve(fallback);
    }, timeoutMs);
  });

  try {
    return await Promise.race([requestFactory(controller.signal), timeout]);
  } catch {
    return fallback;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

// ─── 后端响应类型（与 visit-session.service.ts 对齐） ───

interface TrafficOverview {
  total: number;
  totalChange: number;
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
  suspiciousVisitRecords: number;
  suspiciousVisitRate: number;
  topChannel: string | null;
  topSource: string | null;
  period: {
    current: { start: string; end: string };
    previous: { start: string; end: string };
  };
}

interface ChannelBreakdown {
  channel: string;
  count: number;
  percentage: number;
}

interface SourceBreakdown {
  source: string;
  rawCount: number;
  count: number;
  uniqueVisitors: number;
  suspiciousVisits: number;
  suspiciousRate: number;
  outboundVisits?: number;
  outboundClicks: number;
  outboundRate: number;
  effectiveUsers: number;
  effectiveUserRate: number;
  measuredVisits: number;
  avgActiveDurationMs: number;
  shortStayRate: number;
  engaged10sRate: number;
  engaged30sRate: number;
  avgActiveBeforeOutboundMs: number;
}

interface CampaignBreakdown {
  campaign: string;
  source: string | null;
  medium: string | null;
  rawCount: number;
  count: number;
  uniqueVisitors: number;
  suspiciousVisits: number;
  suspiciousRate: number;
  outboundVisits?: number;
  outboundClicks: number;
  outboundRate: number;
  effectiveUsers: number;
  effectiveUserRate: number;
}

interface LandingPageBreakdown {
  landingPage: string;
  rawCount: number;
  count: number;
  uniqueVisitors: number;
  suspiciousVisits: number;
  suspiciousRate: number;
  outboundVisits?: number;
  outboundClicks: number;
  outboundRate: number;
  effectiveUsers: number;
  effectiveUserRate: number;
}

interface TrafficTrend {
  period: string;
  rawCount: number;
  count: number;
  suspiciousCount: number;
}

interface GeoBreakdown {
  country: string;
  count: number;
  percentage: number;
}

interface DeviceBreakdownData {
  deviceType: string;
  count: number;
  percentage: number;
}

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

interface CaptureLossBreakdown {
  reason: string;
  count: number;
  percentage: number;
}

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
  trueDirectVisits: number;
  trueDirectRate: number;
  otherUnattributedVisits: number;
  otherUnattributedRate: number;
}

interface DirectBreakdown {
  reason: string;
  rawCount: number;
  count: number;
  uniqueVisitors: number;
  shareOfDirect: number;
  shareOfTotal: number;
}

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
  visitToEffectiveRate: number;
  blockers: {
    anonymousOrUnregisteredVisits: number;
    unverifiedUsers: number;
    insufficientProductViews: number;
    missingAction: number;
  };
}

type TrafficView = 'operations' | 'attribution' | 'funnel' | 'fraud' | 'capture';
type AnalyticsScope = 'customer' | 'raw';

const trafficViewOptions: Array<{ label: string; value: TrafficView }> = [
  { label: '运营总览', value: 'operations' },
  { label: '归因质量', value: 'attribution' },
  { label: '行为诊断', value: 'funnel' },
  { label: '反刷诊断', value: 'fraud' },
  { label: '采集对账', value: 'capture' },
];

const trafficViewLabelMap: Record<TrafficView, string> = {
  operations: '运营总览',
  attribution: '归因质量',
  funnel: '行为诊断',
  fraud: '反刷诊断',
  capture: '采集对账',
};

function priorityFromScore(score: number): TrafficExecutionTask['priority'] {
  if (score >= 80) return '高优先';
  if (score >= 45) return '中优先';
  return '观察';
}

function getActionCardCopy(action: string | null): {
  title: string;
  className: string;
} {
  if (action === '建议加预算') {
    return {
      title: '建议加预算',
      className: 'rounded-xl border border-emerald-200 bg-emerald-50 p-4',
    };
  }

  if (action === '继续放量') {
    return {
      title: '继续放量',
      className: 'rounded-xl border border-emerald-200 bg-emerald-50 p-4',
    };
  }

  if (action === '先复核记录') {
    return {
      title: '先复核记录',
      className: 'rounded-xl border border-rose-200 bg-rose-50 p-4',
    };
  }

  if (action === '检查落地页' || action === '检查激活链路') {
    return {
      title: action,
      className: 'rounded-xl border border-amber-200 bg-amber-50 p-4',
    };
  }

  if (action === '继续收集' || action === '建议观察') {
    return {
      title: action,
      className: 'rounded-xl border border-sky-200 bg-sky-50 p-4',
    };
  }

  return {
    title: '样本不足',
    className: 'rounded-xl border border-slate-200 bg-slate-50 p-4',
  };
}

function buildCaptureInsights(
  captureDiagnostics: CaptureDiagnosticsOverview | null,
  reconciliationOverview: ReconciliationOverview | null,
): string[] {
  const insights: string[] = [];

  if (
    reconciliationOverview &&
    reconciliationOverview.referralClicks === 0 &&
    reconciliationOverview.firstPartyVisits > 0
  ) {
    insights.push(
      '当前窗口内没有查到推荐短链点击，但已经出现了带推荐归因的首方访问。通常意味着测试数据、历史归因回填，或点击发生在筛选时间窗之外。',
    );
  }

  if (
    reconciliationOverview &&
    reconciliationOverview.firstPartyVisits > 0 &&
    reconciliationOverview.gaCaptures === 0
  ) {
    insights.push(
      '当前窗口内已经记录到首方访问，但客户端页面浏览记录仍为 0。差异主要发生在客户端采集阶段，而不是首方流量记录阶段。',
    );
  }

  if (captureDiagnostics) {
    const blockedOrFailed =
      (captureDiagnostics.gaBlocked || 0) + (captureDiagnostics.gaFailed || 0);

    if (captureDiagnostics.inAppBrowserVisits > 0) {
      insights.push(
        `当前窗口内有 ${captureDiagnostics.inAppBrowserVisits} 次访问来自内置浏览器。内置浏览器通常是采集成功率偏低的首要原因，建议优先排查 Telegram、微信、Facebook、Instagram 等 WebView。`,
      );
    }

    if (blockedOrFailed > 0) {
      insights.push(
        `客户端采集被拦截或初始化失败共 ${blockedOrFailed} 次。建议结合“捕获 / 丢失原因”表优先查看脚本拦截、加载超时和配置失败。`,
      );
    }

    if (captureDiagnostics.gaReady > captureDiagnostics.gaFirstPageviewSent) {
      insights.push(
        `有 ${
          captureDiagnostics.gaReady - captureDiagnostics.gaFirstPageviewSent
        } 次访问已经具备采集条件，但没有记录到首次页面浏览。这通常说明页面过早退出、脚本触发顺序，或 WebView 环境对页面浏览上报有限制。`,
      );
    }

    if (captureDiagnostics.consentPending > 0) {
      insights.push(
        `仍有 ${captureDiagnostics.consentPending} 次访问未完成统计同意，因此这些访问天然不会进入完整的客户端采集链路。`,
      );
    }
  }

  if (
    reconciliationOverview &&
    reconciliationOverview.unmatchedFirstPartyVisits > 0
  ) {
    insights.push(
      `当前有 ${reconciliationOverview.unmatchedFirstPartyVisits} 次推荐首方访问没有在同窗口内闭环到短链点击。这个差异更可能来自时间窗错位或缺少 click_id，而不是页面采集本身失败。`,
    );
  }

  return insights;
}

function buildFraudNarratives(
  overview: TrafficOverview | null,
  sources: SourceBreakdown[],
): string[] {
  if (!overview) return [];

  const insights: string[] = [];
  const rawGap = overview.total - overview.uniqueSessions;
  const highRiskSources = sources.filter((item) => item.suspiciousRate >= 30);
  const topRiskSource = [...sources].sort((a, b) => b.suspiciousRate - a.suspiciousRate)[0];

  if (rawGap <= 0 && highRiskSources.length === 0 && (topRiskSource?.suspiciousRate || 0) < 10) {
    return [
      `当前窗口内原始记录与去重访问一致，暂未识别到显著重复刷新、脚本重放或异常来源。`,
      `整体重复记录占比 ${formatPercent(overview.suspiciousVisitRate)}，当前更适合把这一页当作低风险复核台账。`,
    ];
  }

  insights.push(
    `当前窗口内原始记录 ${overview.total}，去重访问 ${overview.uniqueSessions}，被去重或判定异常的差值为 ${rawGap}。`,
  );

  insights.push(
    `整体重复记录占比 ${formatPercent(overview.suspiciousVisitRate)}，待复核来源 ${highRiskSources.length} 个。`,
  );

  if (topRiskSource && topRiskSource.suspiciousRate >= 10) {
    insights.push(
      `${formatTrafficSourceLabel(topRiskSource.source)} 是当前最需要复核的来源，重复记录占比 ${formatPercent(topRiskSource.suspiciousRate)}，去重访问 ${topRiskSource.count}。`,
    );
  }

  return insights;
}

function buildAttributionNarratives(
  overview: AttributionQualityOverview | null,
  directBreakdown: DirectBreakdown[],
): string[] {
  if (!overview) return [];

  const insights: string[] = [];
  const safeBreakdown = Array.isArray(directBreakdown) ? directBreakdown : [];
  const topDirectReason = [...safeBreakdown].sort((a, b) => b.count - a.count)[0];

  insights.push(
    `当前窗口内有 ${overview.totalVisits} 次去重访问，其中 ${overview.attributedVisits} 次可识别来源，占比 ${formatPercent(overview.attributedRate)}。`,
  );

  insights.push(
    `UTM 覆盖 ${formatPercent(overview.utmCoverageRate)}，外部 Referrer 覆盖 ${formatPercent(overview.referrerCoverageRate)}，直接/未归因访问占比 ${formatPercent(overview.directRate)}。`,
  );

  if (overview.referralShareUnattributedVisits > 0) {
    insights.push(
      `已有 ${overview.referralShareUnattributedVisits} 次访问落入“推荐分享缺来源”，说明仍有分享入口没有稳定带上 UTM。`,
    );
  }

  if (overview.likelyAutomatedDirectVisits > 0) {
    insights.push(
      `已有 ${overview.likelyAutomatedDirectVisits} 次访问被拆到“疑似自动化 Direct”，建议从国家、商品详情页、设备访问比和浏览器分布复核。`,
    );
  }

  if (topDirectReason) {
    insights.push(
      `当前直接/未归因访问的最大构成是 ${formatDirectReasonLabel(topDirectReason.reason)}，共有 ${topDirectReason.count} 次去重访问，占 Direct 的 ${formatPercent(topDirectReason.shareOfDirect)}。`,
    );
  }

  return insights.slice(0, 4);
}

function buildFunnelNarratives(
  overview: TrafficOverview | null,
  funnelOverview: TrafficBehaviorFunnelOverview | null,
): string[] {
  if (!overview || !funnelOverview) return [];

  const insights: string[] = [];

  insights.push(
    `当前窗口共有 ${overview.highIntentVisitors} 个高意向访客、${overview.activatedUsers} 个激活用户、${overview.effectiveNewUsers} 个有效新用户。`,
  );

  insights.push(
    `有效新用户形成路径为：注册 ${funnelOverview.registrations} -> 验邮 ${funnelOverview.verifiedUsers} -> 浏览达标 ${funnelOverview.productViewReadyUsers} -> 有效新用户 ${funnelOverview.effectiveUsers}。`,
  );

  insights.push(
    `注册到验邮率 ${formatPercent(funnelOverview.registrationToVerificationRate)}，验邮到浏览达标率 ${formatPercent(funnelOverview.verificationToProductViewRate)}，浏览达标到有效新用户率 ${formatPercent(funnelOverview.productViewToEffectiveRate)}。`,
  );

  const largestBlocker = [
    {
      label: '验邮',
      count: funnelOverview.blockers.unverifiedUsers,
      detail: `${funnelOverview.blockers.unverifiedUsers} 个注册用户还没有完成邮箱验证。`,
    },
    {
      label: '浏览深度',
      count: funnelOverview.blockers.insufficientProductViews,
      detail: `${funnelOverview.blockers.insufficientProductViews} 个已验邮箱用户没有达到 3 个不同商品浏览。`,
    },
    {
      label: '动作触发',
      count: funnelOverview.blockers.missingAction,
      detail: `${funnelOverview.blockers.missingAction} 个浏览达标用户还没有发生收藏或购买外跳。`,
    },
  ].sort((a, b) => b.count - a.count)[0];

  if (largestBlocker && largestBlocker.count > 0) {
    insights.push(`当前最大的有效新用户断点在${largestBlocker.label}：${largestBlocker.detail}`);
  } else {
    insights.push('当前新用户链路没有出现明显的单点断层，建议继续看样本质量与归因可信度。');
  }

  return insights.slice(0, 4);
}

type FunnelActionSuggestion = {
  title: string;
  detail: string;
  tone: string;
};

type ViewSummaryBanner = {
  message: string;
  description: string;
  type: 'success' | 'info' | 'warning';
};

function buildFunnelActionSuggestions(
  overview: TrafficBehaviorFunnelOverview | null,
): FunnelActionSuggestion[] {
  const suggestions: FunnelActionSuggestion[] = [];

  suggestions.push({
    title: '先按对象看三类指标',
    detail:
      '高意向访客、激活用户、有效新用户不是同一统计对象。本页只解释可信阶段，不直接给来源扩量结论。',
    tone: 'border-sky-200 bg-sky-50 text-sky-700',
  });

  if (overview) {
    const blockers = [
      {
        label: '验邮',
        count: overview.blockers.unverifiedUsers,
        detail: `${overview.blockers.unverifiedUsers} 个注册用户卡在邮箱验证，优先优化验邮触达和验证页完成率。`,
      },
      {
        label: '浏览深度',
        count: overview.blockers.insufficientProductViews,
        detail: `${overview.blockers.insufficientProductViews} 个已验邮箱用户浏览不足 3 个商品，优先优化商品承接和推荐流转。`,
      },
      {
        label: '动作触发',
        count: overview.blockers.missingAction,
        detail: `${overview.blockers.missingAction} 个浏览达标用户还没收藏或外跳，优先强化按钮与购买动机。`,
      },
    ].sort((a, b) => b.count - a.count)[0];

    if (blockers && blockers.count > 0) {
      suggestions.push({
        title: `优先修复 ${blockers.label}断点`,
        detail: blockers.detail,
        tone: 'border-amber-200 bg-amber-50 text-amber-700',
      });
    }
  }

  return suggestions.slice(0, 3);
}

function buildCompactViewSummary(
  activeView: TrafficView,
  attributionNarratives: string[],
  attributionOverview: AttributionQualityOverview | null,
  funnelNarratives: string[],
  funnelOverview: TrafficBehaviorFunnelOverview | null,
  fraudNarratives: string[],
  topRiskSource: SourceBreakdown | null,
  captureInsights: string[],
  captureDiagnostics: CaptureDiagnosticsOverview | null,
  reconciliationOverview: ReconciliationOverview | null,
): ViewSummaryBanner | null {
  if (activeView === 'attribution' && attributionOverview) {
    return {
      message: '归因速览',
      description:
        attributionNarratives[0] ||
        `当前直接/未归因访问占比 ${formatPercent(attributionOverview.directRate)}，UTM 覆盖 ${formatPercent(attributionOverview.utmCoverageRate)}，推荐分享缺来源 ${attributionOverview.referralShareUnattributedVisits} 次。`,
      type: 'success',
    };
  }

  if (activeView === 'funnel' && funnelOverview) {
    return {
      message: '行为诊断速览',
      description:
        funnelNarratives[0] ||
        `当前有效新用户链路为 注册 ${funnelOverview.registrations} -> 验邮 ${funnelOverview.verifiedUsers} -> 浏览达标 ${funnelOverview.productViewReadyUsers} -> 有效新用户 ${funnelOverview.effectiveUsers}。`,
      type: 'success',
    };
  }

  if (activeView === 'fraud') {
    const hasMaterialRisk = !!topRiskSource && topRiskSource.suspiciousRate >= 10;
    return {
      message: '反刷速览',
      description:
        fraudNarratives[0] ||
        (hasMaterialRisk && topRiskSource
          ? `${formatTrafficSourceLabel(topRiskSource.source)} 当前重复记录占比 ${formatPercent(topRiskSource.suspiciousRate)}，建议先看来源、设备和样本分布。`
          : '当前没有识别到明显的高重复来源。'),
      type: hasMaterialRisk ? 'warning' : 'success',
    };
  }

  if (activeView === 'capture' && captureDiagnostics) {
    return {
      message: '采集速览',
      description:
        captureInsights[0] ||
        `去重首方访问 ${captureDiagnostics.totalVisits} 次，页面浏览采集成功率 ${formatPercent(captureDiagnostics.overallCaptureRate)}；推荐点击闭环率 ${formatPercent(reconciliationOverview?.clickToLandingRate || 0)}。`,
      type: 'warning',
    };
  }

  return null;
}

function buildExecutionTasks(
  overview: TrafficOverview | null,
  attributionOverview: AttributionQualityOverview | null,
  funnelOverview: TrafficBehaviorFunnelOverview | null,
  topSource: SourceBreakdown | null,
  topCampaign: CampaignBreakdown | null,
  topRiskSource: SourceBreakdown | null,
): TrafficExecutionTask[] {
  const tasks: Array<TrafficExecutionTask & { score: number }> = [];

  if (
    topSource &&
    topSource.effectiveUsers >= 2 &&
    topSource.effectiveUserRate >= 3 &&
    topSource.suspiciousRate < 10
  ) {
    tasks.push({
      id: `scale-source-${topSource.source}`,
      title: `扩量 ${formatTrafficSourceLabel(topSource.source)} 来源`,
      summary: `${formatTrafficSourceLabel(topSource.source)} 当前是最稳的有效新用户来源，重复记录压力较低，可以先作为增长主战场继续放量。`,
      metric: `去重访问 ${topSource.count}，有效新用户 ${topSource.effectiveUsers}，有效新用户率 ${formatPercent(topSource.effectiveUserRate)}，重复记录占比 ${formatPercent(topSource.suspiciousRate)}。`,
      action: '保持当前素材和入口路径，优先继续放量这个来源，再观察新增注册和有效新用户是否同步增长。',
      owner: '增长投放',
      priority: priorityFromScore(90 + topSource.effectiveUsers * 5),
      targetView: 'operations',
      targetViewLabel: trafficViewLabelMap.operations,
      score: 90 + topSource.effectiveUsers * 5,
    });
  }

  if (
    topCampaign &&
    topCampaign.effectiveUsers >= 2 &&
    topCampaign.effectiveUserRate >= (overview?.effectiveUserRate || 0)
  ) {
    tasks.push({
      id: `scale-campaign-${topCampaign.campaign}`,
      title: `复制 ${topCampaign.campaign} 活动策略`,
      summary: `${topCampaign.campaign} 当前有效新用户产出不差，适合作为下一轮投放和分享素材的参考模板。`,
      metric: `去重访问 ${topCampaign.count}，有效新用户 ${topCampaign.effectiveUsers}，有效新用户率 ${formatPercent(topCampaign.effectiveUserRate)}。`,
      action: '复用这一活动的入口、文案和触发场景，先做同模版扩展，再看活动间有效新用户率是否保持稳定。',
      owner: '运营投放',
      priority: priorityFromScore(58 + topCampaign.effectiveUsers * 6),
      targetView: 'operations',
      targetViewLabel: trafficViewLabelMap.operations,
      score: 58 + topCampaign.effectiveUsers * 6,
    });
  }

  if (funnelOverview) {
    if (funnelOverview.blockers.unverifiedUsers > 0) {
      const verificationScore =
        funnelOverview.blockers.unverifiedUsers * 10 +
        (100 - funnelOverview.registrationToVerificationRate);

      tasks.push({
        id: 'fix-verification-drop',
        title: '修复验邮断点',
        summary: '注册已经发生，但有一批用户没有进入已验证状态，这会直接卡住后续浏览达标和有效新用户转化。',
        metric: `未验邮箱 ${funnelOverview.blockers.unverifiedUsers} 个，注册到验邮率 ${formatPercent(funnelOverview.registrationToVerificationRate)}。`,
        action: '优先检查验证邮件到达率、验证码页面完成率和站内二次提醒，先把注册用户推进到已验证阶段。',
        owner: 'CRM / 产品',
        priority: priorityFromScore(verificationScore),
        targetView: 'funnel',
        targetViewLabel: trafficViewLabelMap.funnel,
        score: verificationScore,
      });
    }

    if (
      funnelOverview.blockers.insufficientProductViews >
      funnelOverview.blockers.missingAction
    ) {
      const browseScore =
        funnelOverview.blockers.insufficientProductViews * 10 +
        (100 - funnelOverview.verificationToProductViewRate);

      tasks.push({
        id: 'improve-browse-depth',
        title: '提升商品浏览深度',
        summary: '已验邮箱用户更多地卡在浏览不足 3 个商品，说明当前落地页和推荐流转还没有把用户继续带深。',
        metric: `浏览不足用户 ${funnelOverview.blockers.insufficientProductViews} 个，验邮到浏览达标率 ${formatPercent(funnelOverview.verificationToProductViewRate)}。`,
        action: '优先优化首屏推荐、相关推荐和商品列表跳转，让新注册用户更容易连续浏览多个商品。',
        owner: '产品 / 前端',
        priority: priorityFromScore(browseScore),
        targetView: 'funnel',
        targetViewLabel: trafficViewLabelMap.funnel,
        score: browseScore,
      });
    } else if (funnelOverview.blockers.missingAction > 0) {
      const actionScore =
        funnelOverview.blockers.missingAction * 12 +
        (100 - funnelOverview.productViewToEffectiveRate);

      tasks.push({
        id: 'improve-action-trigger',
        title: '强化收藏与购买外跳触发',
        summary: '已经浏览达标的用户仍有一部分没有发生收藏或购买外跳，说明当前 CTA 和购买动机表达还不够强。',
        metric: `缺少动作用户 ${funnelOverview.blockers.missingAction} 个，浏览达标到有效新用户率 ${formatPercent(funnelOverview.productViewToEffectiveRate)}。`,
        action: '优先检查商品详情页和列表页的收藏、购买按钮位置和文案，把“下一步动作”做得更明确。',
        owner: '产品 / 运营',
        priority: priorityFromScore(actionScore),
        targetView: 'funnel',
        targetViewLabel: trafficViewLabelMap.funnel,
        score: actionScore,
      });
    }
  }

  if (
    attributionOverview &&
    (attributionOverview.referralShareUnattributedVisits > 0 ||
      attributionOverview.webviewReferrerLossVisits > 0 ||
      attributionOverview.directRate >= 20)
  ) {
    const attributionScore =
      attributionOverview.referralShareUnattributedVisits * 6 +
      attributionOverview.webviewReferrerLossVisits * 5 +
      attributionOverview.directRate;

    tasks.push({
      id: 'repair-attribution',
      title: '补齐分享与 WebView 归因',
      summary: '当前仍有一部分访问落入直接/未归因访问或推荐分享缺来源，继续投流前需要先把来源识别做实，不然运营判断会被噪音带偏。',
      metric: `直接/未归因访问占比 ${formatPercent(attributionOverview.directRate)}，推荐分享缺来源 ${attributionOverview.referralShareUnattributedVisits} 次，WebView 丢来源 ${attributionOverview.webviewReferrerLossVisits} 次，疑似自动化 Direct ${attributionOverview.likelyAutomatedDirectVisits} 次。`,
      action: '优先排查分享入口是否稳定带 UTM，再检查 Telegram、微信等 WebView 场景是否补充首方来源信号。',
      owner: '数据归因',
      priority: priorityFromScore(attributionScore),
      targetView: 'attribution',
      targetViewLabel: trafficViewLabelMap.attribution,
      score: attributionScore,
    });
  }

  if (topRiskSource && topRiskSource.suspiciousRate >= 10) {
    const riskScore = topRiskSource.suspiciousRate * 2 + topRiskSource.suspiciousVisits * 3;

    tasks.push({
      id: `review-risk-${topRiskSource.source}`,
      title: `复核 ${formatTrafficSourceLabel(topRiskSource.source)} 重复记录`,
      summary: `${formatTrafficSourceLabel(topRiskSource.source)} 的重复记录占比已经高于稳定范围，先确认是否存在异常重放、脚本噪音或错误分享链路。`,
      metric: `去重访问 ${topRiskSource.count}，重复记录 ${topRiskSource.suspiciousVisits}，差值占比 ${formatPercent(topRiskSource.suspiciousRate)}。`,
      action: '先进入反刷诊断页确认是否集中在单一入口、设备或国家，再决定是否限制、过滤或继续观察。',
      owner: '风控 / 数据',
      priority: priorityFromScore(riskScore),
      targetView: 'fraud',
      targetViewLabel: trafficViewLabelMap.fraud,
      score: riskScore,
    });
  }

  return tasks.sort((a, b) => b.score - a.score).slice(0, 5);
}

function buildGrowthBriefReport(
  periodLabel: string,
  overview: TrafficOverview | null,
  attributionOverview: AttributionQualityOverview | null,
  funnelOverview: TrafficBehaviorFunnelOverview | null,
  topSource: SourceBreakdown | null,
  topCampaign: CampaignBreakdown | null,
  topRiskSource: SourceBreakdown | null,
  tasks: TrafficExecutionTask[],
): GrowthBriefReport | null {
  if (!overview) return null;

  const summaryParts: string[] = [
    `本周期共获得 ${overview.uniqueSessions} 次去重访问，形成 ${overview.highIntentVisitors} 个高意向访客、${overview.activatedUsers} 个激活用户，以及 ${overview.effectiveNewUsers} 个有效新用户。`,
  ];

  if (topSource) {
    summaryParts.push(
      `${formatTrafficSourceLabel(topSource.source)} 是当前最强来源，贡献 ${topSource.effectiveUsers} 个有效新用户。`,
    );
  }

  if (funnelOverview?.blockers.insufficientProductViews) {
    summaryParts.push(
      `当前最大行为阻塞在浏览深度，仍有 ${funnelOverview.blockers.insufficientProductViews} 个已验邮箱用户未达到 3 个商品浏览。`,
    );
  } else if (funnelOverview?.blockers.unverifiedUsers) {
    summaryParts.push(
      `当前主要断点在验邮阶段，仍有 ${funnelOverview.blockers.unverifiedUsers} 个注册用户未完成验证。`,
    );
  }

  const wins: string[] = [];
  if (topSource) {
    wins.push(
      `来源表现：${formatTrafficSourceLabel(topSource.source)} 去重访问 ${topSource.count}，有效新用户率 ${formatPercent(topSource.effectiveUserRate)}。`,
    );
  }
  if (topCampaign) {
    wins.push(
      `活动表现：${topCampaign.campaign} 带来 ${topCampaign.effectiveUsers} 个有效新用户，适合继续复用。`,
    );
  }
  if (!wins.length) {
    wins.push('当前样本仍偏少，先继续累积来源与活动数据。');
  }

  const risks: string[] = [];
  if (attributionOverview) {
    risks.push(
      `归因质量：直接/未归因访问占比 ${formatPercent(attributionOverview.directRate)}，推荐分享缺来源 ${attributionOverview.referralShareUnattributedVisits} 次。`,
    );
  }
  if (topRiskSource && topRiskSource.suspiciousRate >= 10) {
    risks.push(
      `质量风险：${formatTrafficSourceLabel(topRiskSource.source)} 重复记录占比 ${formatPercent(topRiskSource.suspiciousRate)}，需要复核样本来源。`,
    );
  }
  if (!risks.length) {
    risks.push('当前未识别出明显的归因或重复记录风险。');
  }

  const nextActions =
    tasks.length > 0
      ? tasks.slice(0, 3).map(
          (task, index) =>
            `${index + 1}. ${task.title}，负责人 ${task.owner}，建议进入${task.targetViewLabel}查看证据。`,
        )
      : ['当前没有足够样本生成明确动作，建议继续积累数据。'];

  return {
    title: '自动增长简报',
    periodLabel,
    summary: summaryParts.join(' '),
    sections: [
      { title: '本周期亮点', points: wins },
      { title: '主要风险', points: risks },
      { title: '下个动作', points: nextActions },
    ],
  };
}

// ─── 渠道中文映射（CSV 导出用） ───

// ─── CSV 导出 ───

function exportToCSV(
  sources: SourceBreakdown[],
  channels: ChannelBreakdown[],
  campaigns: CampaignBreakdown[],
  overview: TrafficOverview | null,
  dateRange: [dayjs.Dayjs, dayjs.Dayjs],
  scope: AnalyticsScope,
  messageApi: { success: (msg: string) => void; warning: (msg: string) => void },
) {
  if (!overview || (sources.length === 0 && channels.length === 0)) {
    messageApi.warning('没有数据可导出');
    return;
  }

  const sections: string[][] = [];

  // 汇总信息
  sections.push(
    ['=== 流量概览 ==='],
    ['统计周期', `${dateRange[0].format('YYYY-MM-DD')} 至 ${dateRange[1].format('YYYY-MM-DD')}`],
    ['统计口径', scope === 'raw' ? '原始口径（包含内部/管理员）' : '顾客口径（排除内部/管理员）'],
    ['首方记录数', String(overview.total)],
    ['首方访问次数', String(overview.uniqueSessions)],
    ['首方访问设备', String(overview.uniqueVisitors)],
    ['环比变化', `${overview.totalChange}%`],
    [],
  );

  // 渠道分布
  sections.push(['=== 渠道分布 ==='], ['渠道', '独立访问', '占比']);
  channels.forEach((c) =>
    sections.push([channelLabels[c.channel] || c.channel, String(c.count), `${c.percentage}%`]),
  );
  sections.push([]);

  // 来源详情
  sections.push(['=== 来源详情 ==='], ['来源', '独立访问', '有外跳访问', '访问外跳率', '有效新用户', '有效新用户率']);
  sources.forEach((s) =>
    sections.push([
      formatTrafficSourceLabel(s.source),
      String(s.count),
      String(getOutboundVisitCount(s)),
      `${s.outboundRate}%`,
      String(s.effectiveUsers),
      `${s.effectiveUserRate}%`,
    ]),
  );
  sections.push([]);

  // Campaign
  if (campaigns.length > 0) {
    sections.push(['=== UTM 推广活动 ==='], ['推广活动', '来源', '媒介', '独立访问', '有外跳访问', '访问外跳率', '有效新用户', '有效新用户率']);
    campaigns.forEach((c) =>
      sections.push([
        c.campaign,
        c.source ? formatTrafficSourceLabel(c.source) : '-',
        c.medium || '-',
        String(c.count),
        String(getOutboundVisitCount(c)),
        `${c.outboundRate}%`,
        String(c.effectiveUsers),
        `${c.effectiveUserRate}%`,
      ]),
    );
  }

  const csvContent = sections.map((row) => row.join(',')).join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `流量分析_${dateRange[0].format('YYYYMMDD')}_${dateRange[1].format('YYYYMMDD')}.csv`,
  );
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  messageApi.success('导出成功');
}

// ─── 主页面 ───

export default function TrafficAnalyticsPage() {
  const { message } = App.useApp();
  const { isReady } = useAdminAuthReady();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('day'),
    dayjs(),
  ]);
  const [activeView, setActiveView] = useState<TrafficView>('operations');
  const [groupBy, setGroupBy] = useState<'day' | 'hour'>('day');
  const [scope, setScope] = useState<AnalyticsScope>('customer');
  const [loading, setLoading] = useState(true);

  // Data states
  const [overview, setOverview] = useState<TrafficOverview | null>(null);
  const [engagementOverview, setEngagementOverview] =
    useState<TrafficEngagementOverview | null>(null);
  const [channels, setChannels] = useState<ChannelBreakdown[]>([]);
  const [sources, setSources] = useState<SourceBreakdown[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignBreakdown[]>([]);
  const [landingPages, setLandingPages] = useState<LandingPageBreakdown[]>([]);
  const [trends, setTrends] = useState<TrafficTrend[]>([]);
  const [geo, setGeo] = useState<GeoBreakdown[]>([]);
  const [devices, setDevices] = useState<DeviceBreakdownData[]>([]);
  const [captureDiagnostics, setCaptureDiagnostics] =
    useState<CaptureDiagnosticsOverview | null>(null);
  const [captureLossBreakdown, setCaptureLossBreakdown] = useState<
    CaptureLossBreakdown[]
  >([]);
  const [attributionOverview, setAttributionOverview] =
    useState<AttributionQualityOverview | null>(null);
  const [directBreakdown, setDirectBreakdown] = useState<DirectBreakdown[]>([]);
  const [findsSpreadsheetDiagnostics, setLoloBuySpreadsheetsDiagnostics] =
    useState<SourceQualityDiagnostics | null>(null);
  const [behaviorFunnelOverview, setBehaviorFunnelOverview] =
    useState<TrafficBehaviorFunnelOverview | null>(null);
  const [reconciliationOverview, setReconciliationOverview] =
    useState<ReconciliationOverview | null>(null);
  const [captureBreakdownDimension, setCaptureBreakdownDimension] =
    useState<CaptureBreakdownDimension>('source');
  const [captureBreakdown, setCaptureBreakdown] = useState<
    CaptureDiagnosticsDimensionBreakdown[]
  >([]);
  const lastSeededTrendKeyRef = useRef<string | null>(null);
  const cacheKey = useMemo(
    () =>
      `admin:analytics:traffic:${dateRange[0].format('YYYY-MM-DD')}:${dateRange[1].format('YYYY-MM-DD')}:scope=${scope}`,
    [dateRange, scope],
  );
  const trendCacheKey = useMemo(
    () =>
      `admin:analytics:traffic:trends:${dateRange[0].format('YYYY-MM-DD')}:${dateRange[1].format('YYYY-MM-DD')}:${groupBy}:scope=${scope}`,
    [dateRange, groupBy, scope],
  );
  const breakdownCacheKey = useMemo(
    () =>
      `admin:analytics:traffic:breakdown:${dateRange[0].format('YYYY-MM-DD')}:${dateRange[1].format('YYYY-MM-DD')}:${captureBreakdownDimension}:scope=${scope}`,
    [captureBreakdownDimension, dateRange, scope],
  );
  const captureInsights = useMemo(
    () => buildCaptureInsights(captureDiagnostics, reconciliationOverview),
    [captureDiagnostics, reconciliationOverview],
  );
  const attributionNarratives = useMemo(
    () => buildAttributionNarratives(attributionOverview, directBreakdown),
    [attributionOverview, directBreakdown],
  );
  const funnelNarratives = useMemo(
    () => buildFunnelNarratives(overview, behaviorFunnelOverview),
    [behaviorFunnelOverview, overview],
  );
  const fraudNarratives = useMemo(
    () => buildFraudNarratives(overview, sources),
    [overview, sources],
  );
  const totalOutboundVisits = useMemo(
    () =>
      overview?.totalOutboundVisits ??
      sources.reduce((sum, item) => sum + getOutboundVisitCount(item), 0),
    [overview?.totalOutboundVisits, sources],
  );
  const outboundVisitRate = useMemo(
    () =>
      overview?.outboundVisitRate ??
      getVisitToOutboundRate(totalOutboundVisits, overview?.uniqueSessions || 0),
    [overview?.outboundVisitRate, overview?.uniqueSessions, totalOutboundVisits],
  );
  const highDuplicateSourceCount = useMemo(
    () => sources.filter((item) => item.suspiciousRate >= 30).length,
    [sources],
  );
  const topSource = useMemo(
    () =>
      [...sources].sort((a, b) => getTrafficOpportunityScore(b) - getTrafficOpportunityScore(a))[0] ||
      null,
    [sources],
  );
  const topCampaign = useMemo(
    () =>
      [...campaigns].sort(
        (a, b) => getTrafficOpportunityScore(b) - getTrafficOpportunityScore(a),
      )[0] || null,
    [campaigns],
  );
  const topLandingPage = useMemo(
    () =>
      [...landingPages].sort(
        (a, b) => getTrafficOpportunityScore(b) - getTrafficOpportunityScore(a),
      )[0] || null,
    [landingPages],
  );
  const topRiskSource = useMemo(
    () => [...sources].sort((a, b) => b.suspiciousRate - a.suspiciousRate)[0] || null,
    [sources],
  );
  const hasMaterialFraudRisk = useMemo(
    () =>
      Boolean(
        overview &&
          (overview.total > overview.uniqueSessions ||
            (topRiskSource?.suspiciousRate || 0) >= 10 ||
            highDuplicateSourceCount > 0),
      ),
    [highDuplicateSourceCount, overview, topRiskSource],
  );
  const topSourceAction = useMemo(
    () => (topSource ? getTrafficAction(topSource) : null),
    [topSource],
  );
  const topSourceActionCard = useMemo(
    () => getActionCardCopy(topSourceAction),
    [topSourceAction],
  );
  const funnelActionSuggestions = useMemo(
    () => buildFunnelActionSuggestions(behaviorFunnelOverview),
    [behaviorFunnelOverview],
  );
  const executionTasks = useMemo(
    () =>
      buildExecutionTasks(
        overview,
        attributionOverview,
        behaviorFunnelOverview,
        topSource,
        topCampaign,
        topRiskSource,
      ),
    [
      attributionOverview,
      behaviorFunnelOverview,
      overview,
      topCampaign,
      topRiskSource,
      topSource,
    ],
  );
  const growthBriefReport = useMemo(
    () =>
      buildGrowthBriefReport(
        `${dateRange[0].format('YYYY-MM-DD')} 至 ${dateRange[1].format('YYYY-MM-DD')}`,
        overview,
        attributionOverview,
        behaviorFunnelOverview,
        topSource,
        topCampaign,
        topRiskSource,
        executionTasks,
      ),
    [
      attributionOverview,
      behaviorFunnelOverview,
      dateRange,
      executionTasks,
      overview,
      topCampaign,
      topRiskSource,
      topSource,
    ],
  );
  const compactViewSummary = useMemo(
    () =>
      buildCompactViewSummary(
        activeView,
        attributionNarratives,
        attributionOverview,
        funnelNarratives,
        behaviorFunnelOverview,
        fraudNarratives,
        topRiskSource,
        captureInsights,
        captureDiagnostics,
        reconciliationOverview,
      ),
    [
      activeView,
      attributionNarratives,
      attributionOverview,
      behaviorFunnelOverview,
      captureDiagnostics,
      captureInsights,
      fraudNarratives,
      funnelNarratives,
      reconciliationOverview,
      topRiskSource,
    ],
  );
  const topDirectReason = useMemo(
    () =>
      (Array.isArray(directBreakdown)
        ? [...directBreakdown].sort((a, b) => b.count - a.count)[0]
        : null) || null,
    [directBreakdown],
  );

  useEffect(() => {
    const cached = readSessionCache<{
      overview: TrafficOverview | null;
      engagementOverview: TrafficEngagementOverview | null;
      channels: ChannelBreakdown[];
      sources: SourceBreakdown[];
      campaigns: CampaignBreakdown[];
      landingPages: LandingPageBreakdown[];
      trends: TrafficTrend[];
      geo: GeoBreakdown[];
      devices: DeviceBreakdownData[];
      captureDiagnostics: CaptureDiagnosticsOverview | null;
      captureLossBreakdown: CaptureLossBreakdown[];
      attributionOverview: AttributionQualityOverview | null;
      directBreakdown: DirectBreakdown[];
      findsSpreadsheetDiagnostics: SourceQualityDiagnostics | null;
      behaviorFunnelOverview: TrafficBehaviorFunnelOverview | null;
      reconciliationOverview: ReconciliationOverview | null;
    }>(cacheKey, TRAFFIC_ANALYTICS_CACHE_TTL_MS);

    if (!cached) return;

    setOverview(cached.overview);
    setEngagementOverview(cached.engagementOverview || null);
    setChannels(cached.channels);
    setSources(cached.sources);
    setCampaigns(cached.campaigns);
    setLandingPages(cached.landingPages);
    setTrends(cached.trends);
    setGeo(cached.geo);
    setDevices(cached.devices);
    setCaptureDiagnostics(cached.captureDiagnostics);
    setCaptureLossBreakdown(cached.captureLossBreakdown);
    setAttributionOverview(cached.attributionOverview || null);
    setDirectBreakdown(
      Array.isArray(cached.directBreakdown) ? cached.directBreakdown : [],
    );
    setLoloBuySpreadsheetsDiagnostics(cached.findsSpreadsheetDiagnostics || null);
    setBehaviorFunnelOverview(cached.behaviorFunnelOverview || null);
    setReconciliationOverview(cached.reconciliationOverview);
    setLoading(false);
  }, [cacheKey]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const startDate = dateRange[0].toISOString();
    const endDate = dateRange[1].endOf('day').toISOString();
    const scopeParams = { startDate, endDate, scope };

    try {
      const [
        overviewData,
        engagementOverviewData,
        channelData,
        sourceData,
        campaignData,
        landingPageData,
        trendData,
        geoData,
        deviceData,
        captureDiagnosticsData,
        captureLossData,
        attributionOverviewData,
        directBreakdownData,
        findsSpreadsheetDiagnosticsData,
        behaviorFunnelOverviewData,
        reconciliationData,
      ] = await Promise.all([
        get<TrafficOverview>('/admin/analytics/traffic/overview', scopeParams),
        get<TrafficEngagementOverview>('/admin/analytics/traffic/engagement/overview', scopeParams),
        get<ChannelBreakdown[]>('/admin/analytics/traffic/by-channel', scopeParams),
        get<SourceBreakdown[]>('/admin/analytics/traffic/by-source', { ...scopeParams, limit: 20 }),
        get<CampaignBreakdown[]>('/admin/analytics/traffic/by-campaign', scopeParams),
        get<LandingPageBreakdown[]>('/admin/analytics/traffic/by-landing-page', { ...scopeParams, limit: 20 }),
        get<TrafficTrend[]>('/admin/analytics/traffic/trends', { ...scopeParams, groupBy }),
        get<GeoBreakdown[]>('/admin/analytics/traffic/geo', scopeParams),
        get<DeviceBreakdownData[]>('/admin/analytics/traffic/devices', scopeParams),
        get<CaptureDiagnosticsOverview>('/admin/analytics/traffic/capture-diagnostics/overview', scopeParams),
        get<CaptureLossBreakdown[]>('/admin/analytics/traffic/capture-diagnostics/loss-breakdown', scopeParams),
        optionalDiagnostic(
          (signal) =>
            get<AttributionQualityOverview>('/admin/analytics/traffic/attribution-quality/overview', scopeParams, { signal }),
          null as AttributionQualityOverview | null,
        ),
        optionalDiagnostic(
          (signal) =>
            get<DirectBreakdown[]>('/admin/analytics/traffic/attribution-quality/direct-breakdown', scopeParams, { signal }),
          [],
        ),
        optionalDiagnostic(
          (signal) =>
            get<SourceQualityDiagnostics>('/admin/analytics/traffic/attribution-quality/source-diagnostics', { ...scopeParams, source: 'lolobuyspreadsheets.com' }, { signal }),
          null as SourceQualityDiagnostics | null,
        ),
        optionalDiagnostic(
          (signal) =>
            get<TrafficBehaviorFunnelOverview>('/admin/analytics/traffic/behavior-funnel/overview', scopeParams, { signal }),
          null as TrafficBehaviorFunnelOverview | null,
        ),
        get<ReconciliationOverview>('/admin/analytics/traffic/reconciliation/overview', scopeParams),
      ]);

      setOverview(overviewData);
      setEngagementOverview(engagementOverviewData);
      setChannels(channelData);
      setSources(sourceData);
      setCampaigns(campaignData);
      setLandingPages(landingPageData);
      setTrends(trendData);
      setGeo(geoData);
      setDevices(deviceData);
      setCaptureDiagnostics(captureDiagnosticsData);
      setCaptureLossBreakdown(captureLossData);
      setAttributionOverview(attributionOverviewData || null);
      setDirectBreakdown(
        Array.isArray(directBreakdownData) ? directBreakdownData : [],
      );
      setLoloBuySpreadsheetsDiagnostics(findsSpreadsheetDiagnosticsData || null);
      setBehaviorFunnelOverview(behaviorFunnelOverviewData || null);
      setReconciliationOverview(reconciliationData);
      writeSessionCache(cacheKey, {
        overview: overviewData,
        engagementOverview: engagementOverviewData,
        channels: channelData,
        sources: sourceData,
        campaigns: campaignData,
        landingPages: landingPageData,
        trends: trendData,
        geo: geoData,
        devices: deviceData,
        captureDiagnostics: captureDiagnosticsData,
        captureLossBreakdown: captureLossData,
        attributionOverview: attributionOverviewData || null,
        directBreakdown: Array.isArray(directBreakdownData)
          ? directBreakdownData
          : [],
        findsSpreadsheetDiagnostics: findsSpreadsheetDiagnosticsData || null,
        behaviorFunnelOverview: behaviorFunnelOverviewData || null,
        reconciliationOverview: reconciliationData,
      });
      writeSessionCache(trendCacheKey, trendData);
      lastSeededTrendKeyRef.current = trendCacheKey;
    } catch {
      // 加载失败时显示空状态
    } finally {
      setLoading(false);
    }
  }, [cacheKey, dateRange, groupBy, scope, trendCacheKey]);

  useEffect(() => {
    if (!isReady) return;
    fetchData();
  }, [fetchData, isReady]);

  // groupBy 变化时只刷新趋势数据
  useEffect(() => {
    if (loading) return;
    if (lastSeededTrendKeyRef.current === trendCacheKey) {
      lastSeededTrendKeyRef.current = null;
      return;
    }
    const startDate = dateRange[0].toISOString();
    const endDate = dateRange[1].endOf('day').toISOString();
    const cachedTrends = readSessionCache<TrafficTrend[]>(
      trendCacheKey,
      TRAFFIC_ANALYTICS_CACHE_TTL_MS,
    );
    if (cachedTrends) {
      setTrends(cachedTrends);
    }
    get<TrafficTrend[]>('/admin/analytics/traffic/trends', { startDate, endDate, groupBy, scope })
      .then((nextTrends) => {
        setTrends(nextTrends);
        writeSessionCache(trendCacheKey, nextTrends);
      })
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, trendCacheKey]);

  useEffect(() => {
    if (loading) return;

    const startDate = dateRange[0].toISOString();
    const endDate = dateRange[1].endOf('day').toISOString();
    const cachedBreakdown = readSessionCache<CaptureDiagnosticsDimensionBreakdown[]>(
      breakdownCacheKey,
      TRAFFIC_ANALYTICS_CACHE_TTL_MS,
    );

    if (cachedBreakdown) {
      setCaptureBreakdown(cachedBreakdown);
    }

    get<CaptureDiagnosticsDimensionBreakdown[]>(
      '/admin/analytics/traffic/capture-diagnostics/breakdown',
      { startDate, endDate, dimension: captureBreakdownDimension, scope },
    )
      .then((nextBreakdown) => {
        setCaptureBreakdown(nextBreakdown);
        writeSessionCache(breakdownCacheKey, nextBreakdown);
      })
      .catch(console.error);
  }, [breakdownCacheKey, captureBreakdownDimension, dateRange, loading, scope]);

  return (
    <div className="p-6">
      {/* 标题 + 日期选择 + 导出 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">流量来源分析</h1>
        <div className="flex items-center gap-3">
          <MetricGlossaryModal />
          <Segmented
            value={scope}
            options={[
              { label: '顾客口径', value: 'customer' },
              { label: '原始口径', value: 'raw' },
            ]}
            onChange={(value) => setScope(value as AnalyticsScope)}
          />
          <RangePicker
            value={dateRange}
            onChange={(dates) =>
              dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])
            }
          />
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() =>
              exportToCSV(sources, channels, campaigns, overview, dateRange, scope, message)
            }
            disabled={!overview || loading}
          >
            导出 CSV
          </Button>
        </div>
      </div>

      <Alert
        className="mb-4"
        type="info"
        showIcon
        message="先看经营结果，再看原因"
        description={
          scope === 'customer'
            ? '当前为顾客口径，默认排除内部 channel 与已登录 admin / super_admin 的前台访问；总览看结果，归因看来源可信度，行为诊断看阻塞点。'
            : '当前为原始口径，包含内部访问和管理员前台访问，仅用于排查埋点、采集漏数、异常样本和历史对账，不建议用于经营判断。'
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {trafficViewOptions.map((option) => (
          <Button
            key={option.value}
            type={activeView === option.value ? 'primary' : 'default'}
            onClick={() => setActiveView(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {activeView === 'operations' ? (
            <>
              <GrowthBriefPanel report={growthBriefReport} />

              <ActionTaskBoard
                tasks={executionTasks}
                onOpenView={(targetView) => setActiveView(targetView as TrafficView)}
              />
            </>
          ) : null}

          {activeView !== 'operations' && compactViewSummary ? (
            <Alert
              className="mb-6"
              type={compactViewSummary.type}
              showIcon
              message={compactViewSummary.message}
              description={compactViewSummary.description}
            />
          ) : null}

          {activeView === 'operations' ? (
            <>
              <LazyTrafficOverviewCards
                data={overview}
                totalOutboundVisits={totalOutboundVisits}
                outboundVisitRate={outboundVisitRate}
              />

              <EngagementOverviewCards data={engagementOverview} />

              <div className="mb-6 grid gap-4 lg:grid-cols-3">
                <div className={topSourceActionCard.className}>
                  <div className="mb-2 text-sm font-medium text-gray-700">
                    {topSourceActionCard.title}
                  </div>
                  <div className="text-base font-semibold text-gray-900">
                    {topSource ? formatTrafficSourceLabel(topSource.source) : '暂无明显领先来源'}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    {topSource
                      ? `去重访问 ${topSource.count}，有效新用户 ${topSource.effectiveUsers}，有效新用户率 ${formatPercent(topSource.effectiveUserRate)}`
                      : '当前样本不足，先继续累积去重流量。'}
                  </div>
                </div>
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                  <div className="mb-2 text-sm font-medium text-violet-700">活动亮点</div>
                  <div className="text-base font-semibold text-gray-900">
                    {topCampaign?.campaign || '暂无明显活动亮点'}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    {topCampaign
                      ? `去重访问 ${topCampaign.count}，有效新用户 ${topCampaign.effectiveUsers}，有效新用户率 ${formatPercent(topCampaign.effectiveUserRate)}`
                      : '当前还没有足够活动样本。'}
                  </div>
                </div>
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                  <div className="mb-2 text-sm font-medium text-sky-700">承接重点</div>
                  <div className="text-base font-semibold text-gray-900">
                    {topLandingPage?.landingPage || '暂无重点落地页'}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    {topLandingPage
                      ? `去重访问 ${topLandingPage.count}，有效新用户 ${topLandingPage.effectiveUsers}，建议 ${getTrafficAction(topLandingPage)}`
                      : '暂无足够承接数据。'}
                  </div>
                </div>
              </div>

              <Row gutter={[16, 16]} className="mb-6">
                <Col xs={24} lg={10}>
                  <LazyChannelPieChart data={channels} />
                </Col>
                <Col xs={24} lg={14}>
                  <LazyTrafficTrendChart
                    data={trends}
                    groupBy={groupBy}
                    onGroupByChange={setGroupBy}
                  />
                </Col>
              </Row>

              <Row gutter={[16, 16]} className="mb-6">
                <Col span={24}>
                  <SourceTable data={sources} variant="operations" />
                </Col>
              </Row>

              <Row gutter={[16, 16]} className="mb-6">
                <Col xs={24} lg={12}>
                  <CampaignTable data={campaigns} />
                </Col>
                <Col xs={24} lg={12}>
                  <LandingPageTable data={landingPages} />
                </Col>
              </Row>
            </>
          ) : null}

          {activeView === 'attribution' ? (
            <>
              <AttributionOverviewCards data={attributionOverview} />

              <div className="mb-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="mb-2 text-sm font-medium text-amber-700">直接/未归因主要构成</div>
                  <div className="text-base font-semibold text-gray-900">
                    {topDirectReason
                      ? formatDirectReasonLabel(topDirectReason.reason)
                      : '暂无直接/未归因数据'}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    {topDirectReason
                      ? `去重访问 ${topDirectReason.count}，占 Direct ${formatPercent(topDirectReason.shareOfDirect)}`
                      : '当前没有可拆解的直接/未归因样本。'}
                  </div>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <div className="mb-2 text-sm font-medium text-rose-700">推荐分享缺来源</div>
                  <div className="text-base font-semibold text-gray-900">
                    {attributionOverview?.referralShareUnattributedVisits || 0}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    占总访问 {formatPercent(
                      attributionOverview?.referralShareUnattributedRate || 0,
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                  <div className="mb-2 text-sm font-medium text-sky-700">WebView 丢来源</div>
                  <div className="text-base font-semibold text-gray-900">
                    {attributionOverview?.webviewReferrerLossVisits || 0}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    占总访问 {formatPercent(
                      attributionOverview?.webviewReferrerLossRate || 0,
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="mb-2 text-sm font-medium text-red-700">疑似自动化 Direct</div>
                  <div className="text-base font-semibold text-gray-900">
                    {attributionOverview?.likelyAutomatedDirectVisits || 0}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    占总访问 {formatPercent(
                      attributionOverview?.likelyAutomatedDirectRate || 0,
                    )}
                  </div>
                </div>
              </div>

              <Row gutter={[16, 16]} className="mb-6">
                <Col span={24}>
                  <DirectBreakdownTable data={directBreakdown} />
                </Col>
              </Row>

              <Row gutter={[16, 16]} className="mb-6">
                <Col span={24}>
                  <SourceQualityDiagnosticsPanel data={findsSpreadsheetDiagnostics} />
                </Col>
              </Row>

              <Row gutter={[16, 16]} className="mb-6">
                <Col span={24}>
                  <SourceTable data={sources} variant="attribution" />
                </Col>
              </Row>
            </>
          ) : null}

          {activeView === 'funnel' ? (
            <>
              <BehaviorFunnelCards overview={overview} data={behaviorFunnelOverview} />

              {funnelActionSuggestions.length > 0 ? (
                <div className="mb-6 grid gap-4 lg:grid-cols-3">
                  {funnelActionSuggestions.map((item) => (
                    <div key={item.title} className={`rounded-xl border p-4 ${item.tone}`}>
                      <div className="mb-2 text-sm font-medium">{item.title}</div>
                      <div className="text-sm">{item.detail}</div>
                    </div>
                  ))}
                </div>
              ) : null}

              <Alert
                className="mb-6"
                type="warning"
                showIcon
                message="来源 / Campaign / 落地页归因已从本视图移出"
                description="这些维度在当前版本里更适合做归因诊断，不适合直接当顺序阶段。要看来源可信度请切到“归因质量”，要看结果请回到“运营总览”。"
              />
            </>
          ) : null}

          {activeView === 'fraud' ? (
            <>
              {!hasMaterialFraudRisk ? (
                <Alert
                  className="mb-6"
                  type="success"
                  showIcon
                  message="当前没有识别到显著反刷异常"
                  description="这一时间窗里原始记录与去重访问基本一致，优先把这里当作低风险复核页，继续观察来源、设备和国家分布即可。"
                />
              ) : null}

              <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="text-sm text-gray-500">原始记录</div>
                  <div className="mt-2 text-2xl font-semibold text-gray-900">
                    {overview?.total || 0}
                  </div>
                  <div className="mt-1 text-xs text-gray-400">含重复刷新、异常重放与脚本噪音</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="text-sm text-gray-500">去重访问</div>
                  <div className="mt-2 text-2xl font-semibold text-gray-900">
                    {overview?.uniqueSessions || 0}
                  </div>
                  <div className="mt-1 text-xs text-gray-400">去重后的运营主口径</div>
                </div>
                <div
                  className={`rounded-xl p-4 ${
                    hasMaterialFraudRisk
                      ? 'border border-red-200 bg-red-50'
                      : 'border border-emerald-200 bg-emerald-50'
                  }`}
                >
                  <div
                    className={`text-sm ${
                      hasMaterialFraudRisk ? 'text-red-600' : 'text-emerald-700'
                    }`}
                  >
                    重复记录差值
                  </div>
                  <div
                    className={`mt-2 text-2xl font-semibold ${
                      hasMaterialFraudRisk ? 'text-red-700' : 'text-emerald-700'
                    }`}
                  >
                    {overview ? overview.total - overview.uniqueSessions : 0}
                  </div>
                  <div
                    className={`mt-1 text-xs ${
                      hasMaterialFraudRisk ? 'text-red-500' : 'text-emerald-600'
                    }`}
                  >
                    重复记录占比 {formatPercent(overview?.suspiciousVisitRate || 0)}
                  </div>
                </div>
                <div
                  className={`rounded-xl p-4 ${
                    hasMaterialFraudRisk
                      ? 'border border-amber-200 bg-amber-50'
                      : 'border border-sky-200 bg-sky-50'
                  }`}
                >
                  <div
                    className={`text-sm ${
                      hasMaterialFraudRisk ? 'text-amber-700' : 'text-sky-700'
                    }`}
                  >
                    {hasMaterialFraudRisk ? '最高待复核来源' : '当前状态'}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-gray-900">
                    {hasMaterialFraudRisk && topRiskSource
                      ? formatTrafficSourceLabel(topRiskSource.source)
                      : '无显著异常'}
                  </div>
                  <div
                    className={`mt-1 text-xs ${
                      hasMaterialFraudRisk ? 'text-amber-700' : 'text-sky-700'
                    }`}
                  >
                    {hasMaterialFraudRisk && topRiskSource
                      ? `${getTrafficRiskLabel(topRiskSource.suspiciousRate)} / 差值占比 ${formatPercent(topRiskSource.suspiciousRate)}`
                      : '当前窗口内没有识别到高重复峰值'}
                  </div>
                </div>
                <div
                  className={`rounded-xl p-4 ${
                    hasMaterialFraudRisk
                      ? 'border border-rose-200 bg-rose-50'
                      : 'border border-teal-200 bg-teal-50'
                  }`}
                >
                  <div
                    className={`text-sm ${
                      hasMaterialFraudRisk ? 'text-rose-700' : 'text-teal-700'
                    }`}
                  >
                    重复记录占比
                  </div>
                  <div
                    className={`mt-2 text-2xl font-semibold ${
                      hasMaterialFraudRisk ? 'text-rose-700' : 'text-teal-700'
                    }`}
                  >
                    {formatPercent(overview?.suspiciousVisitRate || 0)}
                  </div>
                  <div
                    className={`mt-1 text-xs ${
                      hasMaterialFraudRisk ? 'text-rose-500' : 'text-teal-600'
                    }`}
                  >
                    待复核来源 {highDuplicateSourceCount} 个
                  </div>
                </div>
              </div>

              <Row gutter={[16, 16]} className="mb-6">
                <Col span={24}>
                  <SourceTable data={sources} variant="fraud" />
                </Col>
              </Row>

              <Row gutter={[16, 16]} className="mb-6">
                <Col xs={24} lg={12}>
                  <LazyGeoDistribution data={geo} />
                </Col>
                <Col xs={24} lg={12}>
                  <LazyDeviceBreakdown data={devices} />
                </Col>
              </Row>
            </>
          ) : null}

          {activeView === 'capture' ? (
            <>
              <ReconciliationFunnelCards data={reconciliationOverview} />

              <CaptureDiagnosticsCards data={captureDiagnostics} />

              <Row gutter={[16, 16]} className="mb-6">
                <Col span={24}>
                  <CaptureLossTable data={captureLossBreakdown} />
                </Col>
              </Row>

              <Row gutter={[16, 16]} className="mb-6">
                <Col span={24}>
                  <CaptureBreakdownTable
                    dimension={captureBreakdownDimension}
                    data={captureBreakdown}
                    onDimensionChange={setCaptureBreakdownDimension}
                  />
                </Col>
              </Row>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
