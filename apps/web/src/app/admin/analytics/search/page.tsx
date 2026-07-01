'use client';

/**
 * Search Analytics Dashboard
 * 搜索分析仪表盘 - 展示搜索追踪数据
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Row, Col, Statistic, Table, DatePicker, Tabs, Tag, Progress, Tooltip } from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  AimOutlined,
  ExportOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import { get } from '@/lib/api';
import { EmptyState } from '../../components/EmptyState';
import { DashboardSkeleton } from '../../components/PageSkeleton';
import { readSessionCache, writeSessionCache } from '@/lib/session-cache';

const { RangePicker } = DatePicker;
const SEARCH_ANALYTICS_CACHE_TTL_MS = 5 * 60 * 1000;

// Types
interface OverviewData {
  totalSearches: number;
  zeroResultSearches: number;
  zeroResultRate: number;
  totalImpressions: number;
  totalClicks: number;
  ctr: number;
  totalConversions: number;  // API 返回的字段名（实际含义是外跳）
  conversionRate: number;    // API 返回的字段名（实际含义是外跳率）
  rawSearches: number;
  dedupedSearches: number;
  suspiciousSearches: number;
  rawImpressions: number;
  dedupedImpressions: number;
  suspiciousImpressions: number;
  rawClicks: number;
  dedupedClicks: number;
  suspiciousClicks: number;
  rawConversions: number;
  dedupedConversions: number;
  suspiciousConversions: number;
  trustedCtr: number;
  trustedConversionRate: number;
  period: { start: string; end: string };
}

interface TopQuery {
  keyword: string;
  searchCount: number;
  avgResultCount: number;
  clicks: number;
  ctr: number;
  rawSearchCount: number;
  dedupedSearchCount: number;
  suspiciousSearchCount: number;
  rawClicks: number;
  dedupedClicks: number;
  suspiciousClicks: number;
}

interface SearchSuggestion {
  keyword: string;
  type: 'brand_typo' | 'category_typo' | 'english_variant' | 'abbreviation' | 'synonym_exists' | 'category_exists' | 'intent_category' | 'add_product' | 'no_suggestion';
  suggestion?: {
    from: string;
    to: string;
    confidence: number;
  };
  action: string;
  actionType: 'add_synonym' | 'add_product' | 'none';
}

interface ZeroResultQuery {
  keyword: string;
  searchCount: number;
  lastSearchedAt: string;
  suggestion: SearchSuggestion;
  rawSearchCount?: number;
  suspiciousSearchCount?: number;
}

interface LowCTRQuery {
  keyword: string;
  impressions: number;
  clicks: number;
  ctr: number;
  rawImpressions?: number;
  suspiciousImpressions?: number;
  rawClicks?: number;
  suspiciousClicks?: number;
}

interface TrendData {
  period: string;
  searches: number;
  zeroResults: number;
  clicks: number;
  rawSearches?: number;
  rawClicks?: number;
}

export default function SearchAnalyticsPage() {
  const { isReady } = useAdminAuthReady();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(7, 'day').startOf('day'),  // 7天前
    dayjs(),
  ]);

  // 计算天数（用于 API 请求）
  const days = Math.max(1, dateRange[1].diff(dateRange[0], 'day') + 1);

  // Data states
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [topQueries, setTopQueries] = useState<TopQuery[]>([]);
  const [zeroResultQueries, setZeroResultQueries] = useState<ZeroResultQuery[]>([]);
  const [lowCTRQueries, setLowCTRQueries] = useState<LowCTRQuery[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const cacheKey = useMemo(
    () =>
      `admin:analytics:search:${dateRange[0].format('YYYY-MM-DD')}:${dateRange[1].format('YYYY-MM-DD')}`,
    [dateRange],
  );

  useEffect(() => {
    const cached = readSessionCache<{
      overview: OverviewData | null;
      topQueries: TopQuery[];
      zeroResultQueries: ZeroResultQuery[];
      lowCTRQueries: LowCTRQuery[];
      trends: TrendData[];
    }>(cacheKey, SEARCH_ANALYTICS_CACHE_TTL_MS);

    if (!cached) return;

    setOverview(cached.overview);
    setTopQueries(cached.topQueries);
    setZeroResultQueries(cached.zeroResultQueries);
    setLowCTRQueries(cached.lowCTRQueries);
    setTrends(cached.trends);
    setLoading(false);
  }, [cacheKey]);

  // Fetch all data
  useEffect(() => {
    if (!isReady) return;
    const fetchData = async () => {
      setLoading(true);
      const startDate = dateRange[0].toISOString();
      const endDate = dateRange[1].endOf('day').toISOString();

      try {
        const [overviewData, topData, zeroData, lowCTRData, trendsData] = await Promise.all([
          get<OverviewData>('/admin/search-analytics/overview', { days, startDate, endDate }),
          get<TopQuery[]>('/admin/search-analytics/top-queries', { limit: 50, days, startDate, endDate }),
          get<ZeroResultQuery[]>('/admin/search-analytics/zero-results', { limit: 30, days, startDate, endDate }),
          get<LowCTRQuery[]>('/admin/search-analytics/low-ctr', { limit: 30, minImpressions: 5, startDate, endDate }),
          get<TrendData[]>('/admin/search-analytics/trends', { days, groupBy: 'day', startDate, endDate }),
        ]);

        setOverview(overviewData);
        setTopQueries(topData);
        setZeroResultQueries(zeroData);
        setLowCTRQueries(lowCTRData);
        setTrends(trendsData);
        writeSessionCache(cacheKey, {
          overview: overviewData,
          topQueries: topData,
          zeroResultQueries: zeroData,
          lowCTRQueries: lowCTRData,
          trends: trendsData,
        });
      } catch {
        // 加载失败时显示空状态
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [cacheKey, dateRange, days, isReady]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  // Table columns
  const topQueriesColumns = [
    {
      title: '搜索词',
      dataIndex: 'keyword',
      key: 'keyword',
      render: (keyword: string) => (
        <span className="font-medium">{keyword}</span>
      ),
    },
    {
      title: '搜索次数',
      dataIndex: 'searchCount',
      key: 'searchCount',
      sorter: (a: TopQuery, b: TopQuery) => a.searchCount - b.searchCount,
      render: (_: number, record: TopQuery) => (
        <div>
          <div>{record.dedupedSearchCount}</div>
          <div className="text-xs text-gray-400">原始 {record.rawSearchCount}</div>
        </div>
      ),
    },
    {
      title: '平均结果数',
      dataIndex: 'avgResultCount',
      key: 'avgResultCount',
    },
    {
      title: '点击次数',
      dataIndex: 'clicks',
      key: 'clicks',
      render: (_: number, record: TopQuery) => (
        <div>
          <div>{record.dedupedClicks}</div>
          <div className="text-xs text-gray-400">原始 {record.rawClicks}</div>
        </div>
      ),
    },
    {
      title: '可疑量',
      key: 'suspicious',
      render: (_: unknown, record: TopQuery) => {
        const suspicious = record.suspiciousSearchCount + record.suspiciousClicks;
        const color = suspicious >= 20 ? 'red' : suspicious > 0 ? 'orange' : 'green';
        return <Tag color={color}>{suspicious}</Tag>;
      },
    },
    {
      title: 'CTR',
      dataIndex: 'ctr',
      key: 'ctr',
      sorter: (a: TopQuery, b: TopQuery) => a.ctr - b.ctr,
      render: (ctr: number) => {
        const percent = (ctr * 100).toFixed(1);
        const color = ctr > 0.1 ? 'green' : ctr > 0.05 ? 'orange' : 'red';
        return <Tag color={color}>{percent}%</Tag>;
      },
    },
  ];

  // 获取建议类型的图标和颜色
  const getSuggestionDisplay = (suggestion: SearchSuggestion) => {
    const typeConfig: Record<string, { icon: string; color: string; label: string }> = {
      brand_typo: { icon: '🏷️', color: 'red', label: '品牌纠错' },
      category_typo: { icon: '🔤', color: 'orange', label: '拼写纠错' },
      english_variant: { icon: '🔄', color: 'blue', label: '英美变体' },
      abbreviation: { icon: '⚡', color: 'purple', label: '简称扩展' },
      synonym_exists: { icon: '✅', color: 'green', label: '已有同义词' },
      category_exists: { icon: '✅', color: 'green', label: '已有分类' },
      intent_category: { icon: '🎯', color: 'cyan', label: '查询正确' },
      add_product: { icon: '📦', color: 'default', label: '添加商品' },
      no_suggestion: { icon: '❓', color: 'default', label: '无建议' },
    };

    const config = typeConfig[suggestion.type] || typeConfig.no_suggestion;

    return (
      <Tooltip title={suggestion.action}>
        <div className="flex items-center gap-1">
          <span>{config.icon}</span>
          <Tag color={config.color}>{config.label}</Tag>
          {suggestion.suggestion && (
            <span className="text-xs text-gray-500">
              <code className="bg-gray-100 px-1 rounded">{suggestion.suggestion.from}</code>
              {' → '}
              <code className="bg-green-100 px-1 rounded text-green-700">{suggestion.suggestion.to}</code>
            </span>
          )}
        </div>
      </Tooltip>
    );
  };

  const zeroResultColumns = [
    {
      title: '搜索词',
      dataIndex: 'keyword',
      key: 'keyword',
      render: (keyword: string) => (
        <span className="text-red-600 font-medium">{keyword}</span>
      ),
    },
    {
      title: '搜索次数',
      dataIndex: 'searchCount',
      key: 'searchCount',
      sorter: (a: ZeroResultQuery, b: ZeroResultQuery) => a.searchCount - b.searchCount,
      render: (_: number, record: ZeroResultQuery) => (
        <div>
          <div>{record.searchCount}</div>
          {record.rawSearchCount ? (
            <div className="text-xs text-gray-400">原始 {record.rawSearchCount}</div>
          ) : null}
        </div>
      ),
    },
    {
      title: '最后搜索时间',
      dataIndex: 'lastSearchedAt',
      key: 'lastSearchedAt',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '建议操作',
      key: 'action',
      width: 320,
      render: (_: unknown, record: ZeroResultQuery) => getSuggestionDisplay(record.suggestion),
    },
  ];

  const lowCTRColumns = [
    {
      title: '搜索词',
      dataIndex: 'keyword',
      key: 'keyword',
    },
    {
      title: '曝光次数',
      dataIndex: 'impressions',
      key: 'impressions',
      render: (_: number, record: LowCTRQuery) => (
        <div>
          <div>{record.impressions}</div>
          {record.rawImpressions ? (
            <div className="text-xs text-gray-400">原始 {record.rawImpressions}</div>
          ) : null}
        </div>
      ),
    },
    {
      title: '点击次数',
      dataIndex: 'clicks',
      key: 'clicks',
      render: (_: number, record: LowCTRQuery) => (
        <div>
          <div>{record.clicks}</div>
          {record.rawClicks ? (
            <div className="text-xs text-gray-400">原始 {record.rawClicks}</div>
          ) : null}
        </div>
      ),
    },
    {
      title: 'CTR',
      dataIndex: 'ctr',
      key: 'ctr',
      render: (ctr: number) => (
        <span className="text-red-600 font-medium">{(ctr * 100).toFixed(2)}%</span>
      ),
    },
    {
      title: '建议操作',
      key: 'action',
      render: () => (
        <Tag color="orange">优化搜索排序</Tag>
      ),
    },
  ];

  // Trend visualization (simple bar chart using CSS)
  const maxSearches = Math.max(...trends.map(t => t.searches), 1);

  const searchEmptyText = (
    <EmptyState
      icon={<SearchOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
      title="暂无搜索数据"
      description="选定时间范围内暂无搜索记录"
    />
  );

  const tabItems = [
    {
      key: 'top',
      label: '热门搜索词',
      children: (
        <Table
          dataSource={topQueries}
          columns={topQueriesColumns}
          rowKey="keyword"
          locale={{ emptyText: searchEmptyText }}
          pagination={{ pageSize: 20 }}
          size="small"
        />
      ),
    },
    {
      key: 'zero',
      label: (
        <span>
          零结果搜索 <Tag color="red">{zeroResultQueries.length}</Tag>
        </span>
      ),
      children: (
        <Table
          dataSource={zeroResultQueries}
          columns={zeroResultColumns}
          rowKey="keyword"
          locale={{ emptyText: searchEmptyText }}
          pagination={{ pageSize: 20 }}
          size="small"
        />
      ),
    },
    {
      key: 'lowctr',
      label: (
        <span>
          低CTR搜索 <Tag color="orange">{lowCTRQueries.length}</Tag>
        </span>
      ),
      children: (
        <Table
          dataSource={lowCTRQueries}
          columns={lowCTRColumns}
          rowKey="keyword"
          locale={{ emptyText: searchEmptyText }}
          pagination={{ pageSize: 20 }}
          size="small"
        />
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">搜索分析</h1>
        <RangePicker
          value={dateRange}
          onChange={(dates) =>
            dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])
          }
        />
      </div>

      <Alert
        className="mb-4"
        type="info"
        showIcon
        message="本页默认以去重后的可信搜索行为为主"
        description="卡片与表格主值展示的是按可信访客和时间窗去重后的搜索、曝光、点击与外跳；灰字“原始”是未去重事件。两者差值越大，越说明这段时间里存在重复刷新、脚本重放或异常重试。"
      />

      {(overview?.suspiciousSearches || 0) > 0 ||
      (overview?.suspiciousImpressions || 0) > 0 ||
      (overview?.suspiciousClicks || 0) > 0 ? (
        <Alert
          className="mb-4"
          type="warning"
          showIcon
          message="当前窗口检测到重复或可疑搜索事件"
          description={`搜索 ${overview?.suspiciousSearches || 0}、曝光 ${overview?.suspiciousImpressions || 0}、点击 ${overview?.suspiciousClicks || 0} 条事件在去重后被排除。`}
        />
      ) : null}

      {/* Overview Statistics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="可信搜索次数"
              value={overview?.totalSearches || 0}
              prefix={<SearchOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div className="mt-2 text-xs text-gray-400">
              原始 {overview?.rawSearches || 0} / 可疑 {overview?.suspiciousSearches || 0}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="可信曝光次数"
              value={overview?.totalImpressions || 0}
              prefix={<EyeOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div className="mt-2 text-xs text-gray-400">
              原始 {overview?.rawImpressions || 0} / 可疑 {overview?.suspiciousImpressions || 0}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="可信点击次数"
              value={overview?.totalClicks || 0}
              prefix={<AimOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
            <div className="mt-2 text-xs text-gray-400">
              原始 {overview?.rawClicks || 0} / 可疑 {overview?.suspiciousClicks || 0}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="可信外跳次数"
              value={overview?.totalConversions || 0}
              prefix={<ExportOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            <div className="mt-2 text-xs text-gray-400">
              原始 {overview?.rawConversions || 0} / 可疑 {overview?.suspiciousConversions || 0}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Rate Metrics */}
      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} sm={8}>
          <Card>
            <div className="text-gray-500 mb-2">零结果率</div>
            <div className="flex items-center gap-4">
              <Progress
                type="circle"
                percent={Math.round((overview?.zeroResultRate || 0) * 100)}
                size={80}
                strokeColor={(overview?.zeroResultRate || 0) > 0.1 ? '#ff4d4f' : '#52c41a'}
              />
              <div>
                <div className="text-2xl font-bold">
                  {((overview?.zeroResultRate || 0) * 100).toFixed(1)}%
                </div>
                <div className="text-gray-400 text-sm">
                  {overview?.zeroResultSearches || 0} / {overview?.totalSearches || 0}
                </div>
              </div>
            </div>
            {(overview?.zeroResultRate || 0) > 0.1 && (
              <div className="mt-2 text-red-500 text-sm flex items-center gap-1">
                <WarningOutlined /> 零结果率偏高，建议添加同义词
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <div className="text-gray-500 mb-2">点击率 (CTR)</div>
            <div className="flex items-center gap-4">
              <Progress
                type="circle"
                percent={Math.min(Math.round((overview?.ctr || 0) * 100), 100)}
                size={80}
                strokeColor={(overview?.ctr || 0) > 0.05 ? '#52c41a' : '#faad14'}
              />
              <div>
                <div className="text-2xl font-bold">
                  {((overview?.trustedCtr || overview?.ctr || 0) * 100).toFixed(2)}%
                </div>
                <div className="text-gray-400 text-sm">
                  {overview?.totalClicks || 0} / {overview?.totalImpressions || 0}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <div className="text-gray-500 mb-2">外跳率</div>
            <div className="flex items-center gap-4">
              <Progress
                type="circle"
                percent={Math.min(Math.round((overview?.conversionRate || 0) * 100), 100)}
                size={80}
                strokeColor={(overview?.conversionRate || 0) > 0.3 ? '#52c41a' : '#faad14'}
              />
              <div>
                <div className="text-2xl font-bold">
                  {(
                    (overview?.trustedConversionRate || overview?.conversionRate || 0) * 100
                  ).toFixed(2)}%
                </div>
                <div className="text-gray-400 text-sm">
                  {overview?.totalConversions || 0} / {overview?.totalClicks || 0}
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Search Trends */}
      <Card title="搜索趋势" className="mt-4">
        <div className="overflow-x-auto">
          <div className="flex items-end gap-1 h-40 min-w-fit">
            {trends.map((trend) => (
              <Tooltip
                key={trend.period}
                title={
                  <div>
                    <div>{trend.period}</div>
                    <div>可信搜索: {trend.searches}</div>
                    <div>原始搜索: {trend.rawSearches || trend.searches}</div>
                    <div>可信点击: {trend.clicks}</div>
                    <div>原始点击: {trend.rawClicks || trend.clicks}</div>
                    <div>零结果: {trend.zeroResults}</div>
                  </div>
                }
              >
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="w-8 bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                    style={{ height: `${(trend.searches / maxSearches) * 120}px` }}
                  />
                  <div className="text-xs text-gray-400 w-12 text-center truncate">
                    {trend.period.slice(5)}
                  </div>
                </div>
              </Tooltip>
            ))}
          </div>
        </div>
      </Card>

      {/* Detailed Tables */}
      <Card className="mt-4">
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}
