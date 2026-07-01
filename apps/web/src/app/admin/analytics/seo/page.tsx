'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, App, Button, Card, Col, DatePicker, Row, Skeleton, Statistic, Table, Tag, Typography, Upload } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import { get, put } from '@/lib/api';
import { readSessionCache, writeSessionCache } from '@/lib/session-cache';
import {
  ALL_PLATFORM_LANDING_PAGES,
  FEATURED_PLATFORM_LANDING_PAGES,
  getCustomPlatformLandingIntentSlugs,
  getLocalizedPlatformLandingIntentSlugs,
  getPlatformLandingSegment,
  getRelatedPlatformLandingIntents,
  PLATFORM_LANDING_INTENTS,
} from '@/lib/platform-landings';
import {
  parseGscPageMetricsCsv,
  parseSeoLandingGscSnapshot,
  serializeSeoLandingGscSnapshot,
  type SeoLandingGscSnapshot,
  type SeoLandingGscSnapshotRow,
} from '@/lib/seo-gsc';

type PlatformInventoryRow = {
  key: string;
  name: string;
  slug: string;
  segment: string;
  primaryQuery: string;
  aliases: number;
  intents: number;
  sampleTopic: string;
};

type TopicInventoryRow = {
  key: string;
  topic: string;
  query: string;
  categoryMatches: number;
  relatedTopics: string[];
  enCustom: boolean;
  intlCustom: boolean;
};

const { Paragraph, Text } = Typography;
const { RangePicker } = DatePicker;
const SEO_LANDING_TRAFFIC_CACHE_TTL_MS = 5 * 60 * 1000;
const SEO_LANDING_GSC_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SEO_GSC_SNAPSHOT_SETTING_KEY = 'seo_gsc_snapshot';

interface LandingPageBreakdown {
  landingPage: string;
  count: number;
  outboundClicks: number;
  conversionRate: number;
}

type SeoLandingTrafficRow = {
  key: string;
  landingPage: string;
  pageType: 'platform' | 'topic';
  platformName: string;
  topicName: string | null;
  count: number;
  outboundClicks: number;
  conversionRate: number;
};

type SeoLandingGscRow = {
  key: string;
  landingPage: string;
  pageType: 'platform' | 'topic';
  platformName: string;
  topicName: string | null;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

function normalizeLandingPath(rawPath: string): string {
  const withoutOrigin = rawPath.replace(/^https?:\/\/[^/]+/i, '');
  const withoutQuery = withoutOrigin.split('?')[0]?.split('#')[0] || '';
  const segments = withoutQuery.split('/').filter(Boolean);
  const localeSet = new Set(['en', 'zh', 'fr', 'de', 'es', 'it', 'pt', 'ar']);

  if (segments[0] && localeSet.has(segments[0])) {
    return `/${segments.slice(1).join('/')}`;
  }

  return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
}

function classifySeoLandingPage(rawPath: string): SeoLandingTrafficRow | null {
  const normalizedPath = normalizeLandingPath(rawPath);
  const segments = normalizedPath.split('/').filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  const platform = ALL_PLATFORM_LANDING_PAGES.find((page) => page.slug === segments[0]);

  if (!platform) {
    return null;
  }

  if (segments.length === 1) {
    return {
      key: normalizedPath,
      landingPage: normalizedPath,
      pageType: 'platform',
      platformName: platform.name,
      topicName: null,
      count: 0,
      outboundClicks: 0,
      conversionRate: 0,
    };
  }

  const intent = PLATFORM_LANDING_INTENTS.find((item) => item.slug === segments[1]);

  if (!intent) {
    return null;
  }

  return {
    key: normalizedPath,
    landingPage: normalizedPath,
    pageType: 'topic',
    platformName: platform.name,
    topicName: intent.name,
    count: 0,
    outboundClicks: 0,
    conversionRate: 0,
  };
}

export default function SeoLandingInventoryPage() {
  const { message } = App.useApp();
  const { isReady } = useAdminAuthReady();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(28, 'day').startOf('day'),
    dayjs(),
  ]);
  const [trafficLoading, setTrafficLoading] = useState(true);
  const [trafficRows, setTrafficRows] = useState<SeoLandingTrafficRow[]>([]);
  const [gscRows, setGscRows] = useState<SeoLandingGscRow[]>([]);
  const [gscLoading, setGscLoading] = useState(true);
  const [gscSaving, setGscSaving] = useState(false);
  const [gscUploadedAt, setGscUploadedAt] = useState<string | null>(null);
  const [gscSourceLabel, setGscSourceLabel] = useState<string | null>(null);
  const enCustomIntentSlugs = new Set(getCustomPlatformLandingIntentSlugs('en'));
  const localizedFrIntentSlugs = new Set(getLocalizedPlatformLandingIntentSlugs('fr'));
  const localizedDeIntentSlugs = new Set(getLocalizedPlatformLandingIntentSlugs('de'));
  const localizedEsIntentSlugs = new Set(getLocalizedPlatformLandingIntentSlugs('es'));
  const localizedArIntentSlugs = new Set(getLocalizedPlatformLandingIntentSlugs('ar'));
  const localizedItIntentSlugs = new Set(getLocalizedPlatformLandingIntentSlugs('it'));
  const localizedPtIntentSlugs = new Set(getLocalizedPlatformLandingIntentSlugs('pt'));
  const trafficCacheKey = useMemo(
    () =>
      `admin:analytics:seo:${dateRange[0].format('YYYY-MM-DD')}:${dateRange[1].format('YYYY-MM-DD')}`,
    [dateRange],
  );
  const gscCacheKey = 'admin:analytics:seo:gsc-upload';

  const platformRows: PlatformInventoryRow[] = ALL_PLATFORM_LANDING_PAGES.map((page) => ({
    key: page.key,
    name: page.name,
    slug: page.slug,
    segment: getPlatformLandingSegment(page),
    primaryQuery: page.primaryQuery,
    aliases: page.aliases?.length || 0,
    intents: PLATFORM_LANDING_INTENTS.length,
    sampleTopic: `/${page.slug}/${PLATFORM_LANDING_INTENTS[0]?.slug || 'shoes'}`,
  }));

  const topicRows: TopicInventoryRow[] = PLATFORM_LANDING_INTENTS.map((intent) => ({
    key: intent.slug,
    topic: intent.name,
    query: intent.query,
    categoryMatches: intent.categoryMatches.length,
    relatedTopics: getRelatedPlatformLandingIntents(intent.slug).map((item) => item.slug),
    enCustom: enCustomIntentSlugs.has(intent.slug),
    intlCustom:
      localizedFrIntentSlugs.has(intent.slug)
      && localizedDeIntentSlugs.has(intent.slug)
      && localizedEsIntentSlugs.has(intent.slug)
      && localizedArIntentSlugs.has(intent.slug)
      && localizedItIntentSlugs.has(intent.slug)
      && localizedPtIntentSlugs.has(intent.slug),
  }));

  const growthCount = platformRows.filter((row) => row.segment === 'growth').length;
  const longTailCount = platformRows.filter((row) => row.segment === 'long_tail').length;
  const totalAliases = platformRows.reduce((sum, row) => sum + row.aliases, 0);
  const fallbackTopicCount = topicRows.filter((row) => !row.enCustom || !row.intlCustom).length;
  const trafficSummary = useMemo(() => {
    const platformTrafficCount = trafficRows.filter((row) => row.pageType === 'platform').length;
    const topicTrafficCount = trafficRows.filter((row) => row.pageType === 'topic').length;
    const totalVisits = trafficRows.reduce((sum, row) => sum + row.count, 0);
    const totalOutboundClicks = trafficRows.reduce((sum, row) => sum + row.outboundClicks, 0);
    const weightedConversionRate =
      totalVisits > 0
        ? trafficRows.reduce((sum, row) => sum + row.count * row.conversionRate, 0) / totalVisits
        : 0;

    return {
      platformTrafficCount,
      topicTrafficCount,
      totalVisits,
      totalOutboundClicks,
      weightedConversionRate,
    };
  }, [trafficRows]);
  const gscSummary = useMemo(() => {
    const totalClicks = gscRows.reduce((sum, row) => sum + row.clicks, 0);
    const totalImpressions = gscRows.reduce((sum, row) => sum + row.impressions, 0);
    const weightedCtr =
      totalImpressions > 0
        ? gscRows.reduce((sum, row) => sum + row.impressions * row.ctr, 0) / totalImpressions
        : 0;
    const weightedPosition =
      totalImpressions > 0
        ? gscRows.reduce((sum, row) => sum + row.impressions * row.position, 0) / totalImpressions
        : 0;

    return {
      totalClicks,
      totalImpressions,
      weightedCtr,
      weightedPosition,
    };
  }, [gscRows]);
  const clearLocalGscSnapshot = useCallback(() => {
    setGscRows([]);
    setGscUploadedAt(null);
    setGscSourceLabel(null);

    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(gscCacheKey);
    }
  }, [gscCacheKey]);
  const applyGscSnapshot = useCallback(
    (snapshot: SeoLandingGscSnapshot | null) => {
      if (!snapshot) {
        clearLocalGscSnapshot();
        return;
      }

      setGscRows(snapshot.rows);
      setGscUploadedAt(snapshot.uploadedAt);
      setGscSourceLabel(snapshot.sourceLabel);
      writeSessionCache(gscCacheKey, snapshot);
    },
    [clearLocalGscSnapshot, gscCacheKey],
  );

  useEffect(() => {
    const cached = readSessionCache<SeoLandingTrafficRow[]>(
      trafficCacheKey,
      SEO_LANDING_TRAFFIC_CACHE_TTL_MS,
    );

    if (!cached) {
      return;
    }

    setTrafficRows(cached);
    setTrafficLoading(false);
  }, [trafficCacheKey]);

  useEffect(() => {
    const cached = readSessionCache<SeoLandingGscSnapshot>(
      gscCacheKey,
      SEO_LANDING_GSC_CACHE_TTL_MS,
    );

    if (!cached) {
      return;
    }

    applyGscSnapshot(cached);
    setGscLoading(false);
  }, [applyGscSnapshot, gscCacheKey]);

  useEffect(() => {
    if (!isReady) return;
    const fetchPersistedGscSnapshot = async () => {
      try {
        const all = await get<Array<{ key: string; value: string }>>('/admin/settings');
        const snapshot = parseSeoLandingGscSnapshot(
          all.find((setting) => setting.key === SEO_GSC_SNAPSHOT_SETTING_KEY)?.value || '',
        );

        applyGscSnapshot(snapshot);
      } catch {
        // Ignore transient admin fetch errors and keep session cache if present.
      } finally {
        setGscLoading(false);
      }
    };

    fetchPersistedGscSnapshot();
  }, [applyGscSnapshot, isReady]);

  useEffect(() => {
    if (!isReady) return;
    const fetchTrafficRows = async () => {
      setTrafficLoading(true);
      const startDate = dateRange[0].toISOString();
      const endDate = dateRange[1].endOf('day').toISOString();

      try {
        const landingPages = await get<LandingPageBreakdown[]>(
          '/admin/analytics/traffic/by-landing-page',
          { startDate, endDate, limit: 200 },
        );

        const nextRows = landingPages
          .map((row) => {
            const classified = classifySeoLandingPage(row.landingPage);
            return classified
              ? {
                  ...classified,
                  count: row.count,
                  outboundClicks: row.outboundClicks,
                  conversionRate: row.conversionRate,
                }
              : null;
          })
          .filter((row): row is SeoLandingTrafficRow => Boolean(row))
          .sort((left, right) => right.count - left.count);

        setTrafficRows(nextRows);
        writeSessionCache(trafficCacheKey, nextRows);
      } catch {
        setTrafficRows([]);
      } finally {
        setTrafficLoading(false);
      }
    };

    fetchTrafficRows();
  }, [dateRange, isReady, trafficCacheKey]);

  const platformColumns: ColumnsType<PlatformInventoryRow> = [
    {
      title: '平台',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <div>
          <div className="font-medium">{name}</div>
          <Text type="secondary">{record.primaryQuery}</Text>
        </div>
      ),
    },
    {
      title: '分层',
      dataIndex: 'segment',
      key: 'segment',
      render: (segment: string) => {
        const color =
          segment === 'featured' ? 'gold' : segment === 'growth' ? 'blue' : 'default';
        const label =
          segment === 'featured' ? '核心平台' : segment === 'growth' ? '增长平台' : '长尾平台';
        return <Tag color={color}>{label}</Tag>;
      },
      filters: [
        { text: '核心平台', value: 'featured' },
        { text: '增长平台', value: 'growth' },
        { text: '长尾平台', value: 'long_tail' },
      ],
      onFilter: (value, record) => record.segment === value,
    },
    {
      title: 'Alias 数',
      dataIndex: 'aliases',
      key: 'aliases',
      sorter: (a, b) => a.aliases - b.aliases,
    },
    {
      title: 'Topic 页',
      dataIndex: 'intents',
      key: 'intents',
    },
    {
      title: '样例 URL',
      dataIndex: 'sampleTopic',
      key: 'sampleTopic',
      render: (sampleTopic: string) => (
        <Link href={sampleTopic} target="_blank" className="text-blue-600 hover:text-blue-500">
          {sampleTopic}
        </Link>
      ),
    },
  ];

  const topicColumns: ColumnsType<TopicInventoryRow> = [
    {
      title: 'Topic',
      dataIndex: 'topic',
      key: 'topic',
      render: (topic: string, record) => (
        <div>
          <div className="font-medium">{topic}</div>
          <Text type="secondary">{record.query}</Text>
        </div>
      ),
    },
    {
      title: '类目匹配词',
      dataIndex: 'categoryMatches',
      key: 'categoryMatches',
      sorter: (a, b) => a.categoryMatches - b.categoryMatches,
    },
    {
      title: 'EN 定制',
      dataIndex: 'enCustom',
      key: 'enCustom',
      render: (value: boolean) => (
        <Tag color={value ? 'green' : 'default'}>{value ? '定制' : 'Fallback'}</Tag>
      ),
      filters: [
        { text: '定制', value: true },
        { text: 'Fallback', value: false },
      ],
      onFilter: (value, record) => record.enCustom === value,
    },
    {
      title: 'FR/DE/ES/AR/IT/PT 定制',
      dataIndex: 'intlCustom',
      key: 'intlCustom',
      render: (value: boolean) => (
        <Tag color={value ? 'green' : 'default'}>{value ? '定制' : 'Fallback'}</Tag>
      ),
      filters: [
        { text: '定制', value: true },
        { text: 'Fallback', value: false },
      ],
      onFilter: (value, record) => record.intlCustom === value,
    },
    {
      title: '相关 Topic',
      dataIndex: 'relatedTopics',
      key: 'relatedTopics',
      render: (relatedTopics: string[]) => (
        <div className="flex flex-wrap gap-1">
          {relatedTopics.map((slug) => (
            <Tag key={slug}>{slug}</Tag>
          ))}
        </div>
      ),
    },
  ];

  const trafficColumns: ColumnsType<SeoLandingTrafficRow> = [
    {
      title: '落地页',
      dataIndex: 'landingPage',
      key: 'landingPage',
      render: (landingPage: string) => (
        <Link href={landingPage} target="_blank" className="font-mono text-blue-600 hover:text-blue-500">
          {landingPage}
        </Link>
      ),
    },
    {
      title: '类型',
      dataIndex: 'pageType',
      key: 'pageType',
      render: (pageType: SeoLandingTrafficRow['pageType']) => (
        <Tag color={pageType === 'platform' ? 'gold' : 'blue'}>
          {pageType === 'platform' ? '平台页' : 'Topic 页'}
        </Tag>
      ),
      filters: [
        { text: '平台页', value: 'platform' },
        { text: 'Topic 页', value: 'topic' },
      ],
      onFilter: (value, record) => record.pageType === value,
    },
    {
      title: '平台',
      dataIndex: 'platformName',
      key: 'platformName',
    },
    {
      title: 'Topic',
      dataIndex: 'topicName',
      key: 'topicName',
      render: (topicName: string | null) => topicName || <Text type="secondary">总页</Text>,
    },
    {
      title: '访问量',
      dataIndex: 'count',
      key: 'count',
      sorter: (a, b) => a.count - b.count,
      defaultSortOrder: 'descend',
    },
    {
      title: '外跳数',
      dataIndex: 'outboundClicks',
      key: 'outboundClicks',
      sorter: (a, b) => a.outboundClicks - b.outboundClicks,
    },
    {
      title: '转化率',
      dataIndex: 'conversionRate',
      key: 'conversionRate',
      sorter: (a, b) => a.conversionRate - b.conversionRate,
      render: (conversionRate: number) => {
        const color =
          conversionRate >= 5 ? 'green' : conversionRate >= 2 ? 'blue' : 'default';
        return <Tag color={color}>{conversionRate}%</Tag>;
      },
    },
  ];

  const gscColumns: ColumnsType<SeoLandingGscRow> = [
    {
      title: '落地页',
      dataIndex: 'landingPage',
      key: 'landingPage',
      render: (landingPage: string) => (
        <Link href={landingPage} target="_blank" className="font-mono text-blue-600 hover:text-blue-500">
          {landingPage}
        </Link>
      ),
    },
    {
      title: '类型',
      dataIndex: 'pageType',
      key: 'pageType',
      render: (pageType: SeoLandingGscRow['pageType']) => (
        <Tag color={pageType === 'platform' ? 'gold' : 'blue'}>
          {pageType === 'platform' ? '平台页' : 'Topic 页'}
        </Tag>
      ),
    },
    {
      title: '平台',
      dataIndex: 'platformName',
      key: 'platformName',
    },
    {
      title: 'Topic',
      dataIndex: 'topicName',
      key: 'topicName',
      render: (topicName: string | null) => topicName || <Text type="secondary">总页</Text>,
    },
    {
      title: '点击',
      dataIndex: 'clicks',
      key: 'clicks',
      sorter: (a, b) => a.clicks - b.clicks,
    },
    {
      title: '展现',
      dataIndex: 'impressions',
      key: 'impressions',
      sorter: (a, b) => a.impressions - b.impressions,
      defaultSortOrder: 'descend',
    },
    {
      title: 'CTR',
      dataIndex: 'ctr',
      key: 'ctr',
      sorter: (a, b) => a.ctr - b.ctr,
      render: (ctr: number) => <Tag color={ctr >= 5 ? 'green' : ctr >= 2 ? 'blue' : 'default'}>{ctr.toFixed(2)}%</Tag>,
    },
    {
      title: '平均排名',
      dataIndex: 'position',
      key: 'position',
      sorter: (a, b) => a.position - b.position,
      render: (position: number) => position.toFixed(2),
    },
  ];

  const handleGscCsvUpload: UploadProps['beforeUpload'] = async (file) => {
    const text = await file.text();
    const parsedRows = parseGscPageMetricsCsv(text);

    if (parsedRows.length === 0) {
      message.warning('CSV 未解析到可用的 GSC Pages 数据，请检查导出格式。');
      return false;
    }

    const nextRows = parsedRows
      .map((row) => {
        const classified = classifySeoLandingPage(row.page);

        return classified
          ? {
              key: classified.key,
              landingPage: classified.landingPage,
              pageType: classified.pageType,
              platformName: classified.platformName,
              topicName: classified.topicName,
              clicks: row.clicks,
              impressions: row.impressions,
              ctr: row.ctr,
              position: row.position,
            }
          : null;
      })
      .filter((row): row is SeoLandingGscSnapshotRow => Boolean(row))
      .sort((left, right) => right.impressions - left.impressions);

    if (nextRows.length === 0) {
      message.warning('CSV 已解析，但没有命中当前平台页或 Topic 页。');
      return false;
    }

    const snapshot: SeoLandingGscSnapshot = {
      rows: nextRows,
      uploadedAt: new Date().toISOString(),
      sourceLabel: file.name || null,
    };

    setGscSaving(true);

    try {
      await put(`/admin/settings/${SEO_GSC_SNAPSHOT_SETTING_KEY}`, {
        value: serializeSeoLandingGscSnapshot(snapshot),
      });
      applyGscSnapshot(snapshot);
      message.success(`GSC 快照已保存，共命中 ${nextRows.length} 个 SEO 落地页。`);
    } catch {
      applyGscSnapshot(snapshot);
      message.warning('GSC 快照已导入当前会话，但持久化保存失败。');
    } finally {
      setGscSaving(false);
    }

    return false;
  };

  const handleClearGscSnapshot = async () => {
    setGscSaving(true);

    try {
      await put(`/admin/settings/${SEO_GSC_SNAPSHOT_SETTING_KEY}`, {
        value: '',
      });
      clearLocalGscSnapshot();
      message.success('GSC 快照已清空。');
    } catch {
      message.error('清空 GSC 快照失败。');
    } finally {
      setGscSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">SEO 落地页盘点</h1>
        <Paragraph className="mt-2 mb-0 text-sm text-muted">
          这是平台词 SEO 网络的基础运营面板。专业团队会先看分层、topic 覆盖、alias
          覆盖和 fallback 缺口，再决定下一批扩张资源投向哪里。
        </Paragraph>
      </div>

      <Alert
        type="info"
        showIcon
        message="下一步建议"
        description={`优先关注增长平台和仍在 fallback 的 topic。当前共有 ${growthCount} 个增长平台、${fallbackTopicCount} 个 topic 仍未完成 EN + FR/DE/ES/AR/IT/PT 核心语言定制。`}
      />

      <Card
        title="SEO 落地页真实表现"
        extra={
          <RangePicker
            value={dateRange}
            onChange={(dates) =>
              dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])
            }
          />
        }
      >
        <Paragraph className="mb-4 text-sm text-muted">
          这里直接复用后台现有的 landing page 流量接口，过滤出平台页和 topic 页，用于判断哪些 SEO
          落地页已经开始拿到真实访问和外跳。
        </Paragraph>

        {trafficLoading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12} xl={6}>
                <Card>
                  <Statistic title="命中 SEO 落地页" value={trafficRows.length} />
                </Card>
              </Col>
              <Col xs={24} md={12} xl={6}>
                <Card>
                  <Statistic title="平台页有流量" value={trafficSummary.platformTrafficCount} />
                </Card>
              </Col>
              <Col xs={24} md={12} xl={6}>
                <Card>
                  <Statistic title="Topic 页有流量" value={trafficSummary.topicTrafficCount} />
                </Card>
              </Col>
              <Col xs={24} md={12} xl={6}>
                <Card>
                  <Statistic title="总访问量" value={trafficSummary.totalVisits} />
                </Card>
              </Col>
              <Col xs={24} md={12} xl={6}>
                <Card>
                  <Statistic title="总外跳数" value={trafficSummary.totalOutboundClicks} />
                </Card>
              </Col>
              <Col xs={24} md={12} xl={6}>
                <Card>
                  <Statistic
                    title="加权转化率"
                    value={Number(trafficSummary.weightedConversionRate.toFixed(2))}
                    suffix="%"
                  />
                </Card>
              </Col>
            </Row>

            <div className="mt-6">
              <Table
                rowKey="key"
                columns={trafficColumns}
                dataSource={trafficRows}
                pagination={{ pageSize: 12 }}
                locale={{
                  emptyText: '当前时间范围内还没有命中平台页或 Topic 页的落地流量。',
                }}
              />
            </div>
          </>
        )}
      </Card>

      <Card
        title="GSC 手动快照"
        extra={
          <div className="flex items-center gap-2">
            <Button
              icon={<DeleteOutlined />}
              onClick={handleClearGscSnapshot}
              disabled={gscRows.length === 0}
              loading={gscSaving}
            >
              清空快照
            </Button>
            <Upload
              showUploadList={false}
              beforeUpload={handleGscCsvUpload}
              accept=".csv,text/csv"
              disabled={gscSaving}
            >
              <Button icon={<UploadOutlined />} loading={gscSaving}>
                导入 GSC CSV
              </Button>
            </Upload>
          </div>
        }
      >
        <Paragraph className="mb-4 text-sm text-muted">
          从 Search Console 导出 Pages 报表 CSV 后可以直接导入这里。当前支持常见英文和中文表头，
          数据会持久化保存到后台设置，方便后续排查哪些平台页和 Topic 页已经开始在 Google 端拿到展现。
        </Paragraph>

        {gscUploadedAt && (
          <Alert
            className="mb-4"
            type="success"
            showIcon
            message="最近一次 GSC 快照"
            description={`导入时间：${new Date(gscUploadedAt).toLocaleString('zh-CN')}${gscSourceLabel ? `｜文件：${gscSourceLabel}` : ''}`}
          />
        )}

        {gscLoading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12} xl={6}>
                <Card>
                  <Statistic title="GSC 命中页数" value={gscRows.length} />
                </Card>
              </Col>
              <Col xs={24} md={12} xl={6}>
                <Card>
                  <Statistic title="总点击" value={gscSummary.totalClicks} />
                </Card>
              </Col>
              <Col xs={24} md={12} xl={6}>
                <Card>
                  <Statistic title="总展现" value={gscSummary.totalImpressions} />
                </Card>
              </Col>
              <Col xs={24} md={12} xl={6}>
                <Card>
                  <Statistic title="加权 CTR" value={Number(gscSummary.weightedCtr.toFixed(2))} suffix="%" />
                </Card>
              </Col>
              <Col xs={24} md={12} xl={6}>
                <Card>
                  <Statistic title="加权平均排名" value={Number(gscSummary.weightedPosition.toFixed(2))} />
                </Card>
              </Col>
            </Row>

            <div className="mt-6">
              <Table
                rowKey="key"
                columns={gscColumns}
                dataSource={gscRows}
                pagination={{ pageSize: 12 }}
                locale={{
                  emptyText: '还没有导入 GSC Pages CSV。',
                }}
              />
            </div>
          </>
        )}
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="平台落地页" value={ALL_PLATFORM_LANDING_PAGES.length} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="核心平台" value={FEATURED_PLATFORM_LANDING_PAGES.length} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="增长平台" value={growthCount} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="长尾平台" value={longTailCount} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="Alias 总数" value={totalAliases} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic
              title="Topic 组合页"
              value={ALL_PLATFORM_LANDING_PAGES.length * PLATFORM_LANDING_INTENTS.length}
            />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="Topic 总数" value={PLATFORM_LANDING_INTENTS.length} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="EN 已定制 Topic" value={enCustomIntentSlugs.size} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic
              title="FR/DE/ES/AR/IT/PT 已定制 Topic"
              value={
                topicRows.filter((row) => row.intlCustom).length
              }
            />
          </Card>
        </Col>
      </Row>

      <Card title="平台层盘点">
        <Table
          rowKey="key"
          columns={platformColumns}
          dataSource={platformRows}
          pagination={{ pageSize: 12 }}
        />
      </Card>

      <Card title="Topic 层盘点">
        <Table
          rowKey="key"
          columns={topicColumns}
          dataSource={topicRows}
          pagination={false}
        />
      </Card>

      <Alert
        type="warning"
        showIcon
        message="这仍然不是 GSC 替代品"
        description="这个面板现在已经包含手动导入的 GSC 快照，但它仍然不是实时 Search Console 数据源，也没有自动索引覆盖状态。下一步要接的是正式的数据导入或 API 方案。"
      />
    </div>
  );
}
