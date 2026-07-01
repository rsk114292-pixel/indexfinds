'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Table, App, Button, Tag, Image, Space, Input, InputNumber, Select } from 'antd';
import { StarOutlined, StarFilled, SearchOutlined, PictureOutlined, EditOutlined } from '@ant-design/icons';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import { get, put } from '@/lib/api';
import { getFullResolutionUrl, getProductListThumbnail } from '@/lib/image-utils';
import { AdminQcImageEditor } from '../components/AdminQcImageEditor';

const HIGH_HEAT_THRESHOLD = 0.6;

interface HotProduct {
  id: string;
  title: string;
  slug: string;
  mainImage: string;
  popularityScore: number;
  viewCount: number;
  clickCount: number;
  salesCount: number;
  favoriteCount: number;
  ctr: number;
  trustedViewCount30d: number;
  trustedClickCount30d: number;
  trustedCtr30d: number;
  isFeatured: boolean;
  featuredSort: number;
  qcPhotoCount?: number;
  createdAt: string;
}

interface HotProductsResponse {
  data: HotProduct[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  summary?: {
    withoutQc: number;
    qcLessThan3: number;
    featuredWithoutQc: number;
    highHeatWithoutQc: number;
  };
}

function getDaysOnShelf(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
}

function getProductPriority(product: HotProduct) {
  const qcCount = product.qcPhotoCount || 0;
  const daysOnShelf = getDaysOnShelf(product.createdAt);

  if (product.isFeatured && qcCount === 0) {
    return { level: '高优先级', reason: '推荐缺 QC', color: 'red' as const };
  }

  if (qcCount === 0 && Number(product.popularityScore || 0) >= HIGH_HEAT_THRESHOLD) {
    return { level: '高优先级', reason: '高热缺 QC', color: 'volcano' as const };
  }

  if (daysOnShelf <= 7 && qcCount === 0) {
    return { level: '中优先级', reason: '新上架缺 QC', color: 'blue' as const };
  }

  if (qcCount > 0 && qcCount < 3) {
    return { level: '中优先级', reason: 'QC 待补', color: 'gold' as const };
  }

  return { level: '低优先级', reason: '已达基础', color: 'default' as const };
}

export default function HotProductsPage() {
  const { message } = App.useApp();
  const { isReady } = useAdminAuthReady();
  const router = useRouter();
  const [products, setProducts] = useState<HotProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [qcState, setQcState] = useState<'with' | 'without' | ''>('');
  const [featuredState, setFeaturedState] = useState<'featured' | 'not_featured' | ''>('');
  const [shelfDays, setShelfDays] = useState<'7' | '8_30' | '30_plus' | ''>('');
  const [qcLevel, setQcLevel] = useState<'lt3' | 'gte3' | ''>('');
  const [minPopularityScore, setMinPopularityScore] = useState<number | null>(null);
  const [showCurrentPageWithoutQcOnly, setShowCurrentPageWithoutQcOnly] = useState(false);
  const [summary, setSummary] = useState({
    withoutQc: 0,
    qcLessThan3: 0,
    featuredWithoutQc: 0,
    highHeatWithoutQc: 0,
  });
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
  const [savingId, setSavingId] = useState<string | null>(null);
  const [qcEditorProduct, setQcEditorProduct] = useState<HotProduct | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        limit: pageSize,
        includeSummary: false,
      };
      if (search.trim()) params.search = search.trim();
      if (qcState) params.qcState = qcState;
      if (featuredState) params.featuredState = featuredState;
      if (shelfDays) params.shelfDays = shelfDays;
      if (qcLevel) params.qcLevel = qcLevel;
      if (minPopularityScore != null) params.minPopularityScore = minPopularityScore;
      const res = await get<HotProductsResponse>('/admin/products/hot', params);
      if (!isMountedRef.current) return;
      setProducts(res.data || []);
      setTotal(res.meta?.total || 0);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      message.error(err instanceof Error ? err.message : '获取热门商品失败');
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [
    page,
    pageSize,
    search,
    qcState,
    featuredState,
    shelfDays,
    qcLevel,
    minPopularityScore,
    message,
  ]);

  const fetchSummary = useCallback(async () => {
    try {
      const params: Record<string, unknown> = {};
      if (search.trim()) params.search = search.trim();
      if (qcState) params.qcState = qcState;
      if (featuredState) params.featuredState = featuredState;
      if (shelfDays) params.shelfDays = shelfDays;
      if (qcLevel) params.qcLevel = qcLevel;
      if (minPopularityScore != null) params.minPopularityScore = minPopularityScore;
      const res = await get<NonNullable<HotProductsResponse['summary']>>(
        '/admin/products/hot/summary',
        params,
      );
      if (!isMountedRef.current) return;
      setSummary(res);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      message.error(err instanceof Error ? err.message : '获取热门商品统计失败');
    }
  }, [
    search,
    qcState,
    featuredState,
    shelfDays,
    qcLevel,
    minPopularityScore,
    message,
  ]);

  useEffect(() => {
    if (!isReady) return;
    fetchProducts();
  }, [fetchProducts, isReady]);

  useEffect(() => {
    if (!isReady) return;
    fetchSummary();
  }, [fetchSummary, isReady]);

  useEffect(() => {
    if (!isReady) return;
    get<{
      alerts?: Array<{
        id: string;
        severity: 'medium' | 'high';
        title: string;
        description: string;
        reasons: string[];
        type: 'referral' | 'product';
      }>;
    }>('/admin/analytics/alerts')
      .then((result) => {
        setAlerts((result.alerts || []).filter((alert) => alert.type === 'product'));
      })
      .catch(() => {
        setAlerts([]);
      });
  }, [isReady]);

  const handleSortChange = async (id: string, val: number) => {
    setSavingId(id);
    try {
      await put('/admin/products/featured-sort', { items: [{ id, featuredSort: val }] });
      if (!isMountedRef.current) return;
      message.success('排序已更新');
      fetchProducts();
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      message.error(err instanceof Error ? err.message : '保存排序失败');
    } finally {
      if (isMountedRef.current) setSavingId(null);
    }
  };

  const handleToggleFeatured = async (id: string) => {
    try {
      const res = await put<{ isFeatured: boolean }>(`/admin/products/${id}/featured`, {});
      if (!isMountedRef.current) return;
      message.success(res.isFeatured ? '已设为推荐' : '已取消推荐');
      fetchProducts();
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      message.error(err instanceof Error ? err.message : '操作失败');
    }
  };

  const goToEdit = (id: string) => {
    router.push(`/admin/products/${id}?from=hot`);
  };

  const resetFilters = () => {
    setSearch('');
    setQcState('');
    setFeaturedState('');
    setShelfDays('');
    setQcLevel('');
    setMinPopularityScore(null);
    setShowCurrentPageWithoutQcOnly(false);
    setPage(1);
  };

  const quickFilterFeaturedWithoutQcActive =
    qcState === 'without' &&
    featuredState === 'featured' &&
    qcLevel === '' &&
    minPopularityScore == null;
  const quickFilterHighHeatWithoutQcActive =
    qcState === 'without' &&
    qcLevel === '' &&
    minPopularityScore === HIGH_HEAT_THRESHOLD;
  const quickFilterQcLessThan3Active =
    qcState === 'with' &&
    qcLevel === 'lt3' &&
    minPopularityScore == null;
  const currentPageWithoutQcCount = products.filter(
    (product) => (product.qcPhotoCount || 0) === 0,
  ).length;
  const currentPageFeaturedWithoutQcCount = products.filter(
    (product) => product.isFeatured && (product.qcPhotoCount || 0) === 0,
  ).length;
  const currentPageQcLessThan3Count = products.filter((product) => {
    const qcCount = product.qcPhotoCount || 0;
    return qcCount > 0 && qcCount < 3;
  }).length;
  const currentPageHighHeatWithoutQcCount = products.filter(
    (product) =>
      (product.qcPhotoCount || 0) === 0 &&
      Number(product.popularityScore || 0) >= HIGH_HEAT_THRESHOLD,
  ).length;
  const visibleProducts = showCurrentPageWithoutQcOnly
    ? products.filter((product) => (product.qcPhotoCount || 0) === 0)
    : products;
  const visibleWithoutQcCount = visibleProducts.filter(
    (product) => (product.qcPhotoCount || 0) === 0,
  ).length;

  const columns = [
    {
      title: '#',
      width: 50,
      render: (_: unknown, __: unknown, index: number) => (page - 1) * pageSize + index + 1,
    },
    {
      title: '商品',
      dataIndex: 'title',
      width: 300,
      render: (title: string, record: HotProduct) => (
        <div className="flex w-[300px] min-w-0 items-center gap-2">
          <Image
            src={record.mainImage ? getProductListThumbnail(record.mainImage) : undefined}
            alt={title}
            width={40}
            height={40}
            className="shrink-0 rounded object-cover"
            fallback="/placeholder.png"
            preview={
              record.mainImage
                ? {
                    src: getFullResolutionUrl(record.mainImage),
                    mask: '查看原图',
                  }
                : false
            }
          />
          <Button
            type="link"
            className="!h-auto !min-w-0 !p-0 text-left"
            onClick={() => goToEdit(record.id)}
          >
            <span className="block max-w-[248px] break-words text-sm whitespace-normal line-clamp-2">
              {title}
            </span>
          </Button>
        </div>
      ),
    },
    {
      title: '热度分',
      dataIndex: 'popularityScore',
      width: 100,
      sorter: (a: HotProduct, b: HotProduct) => Number(a.popularityScore) - Number(b.popularityScore),
      render: (score: number | string) => (
        <span className="font-mono font-semibold">{Number(score ?? 0).toFixed(4)}</span>
      ),
    },
    {
      title: '可信 30d',
      key: 'trustedActivity',
      width: 170,
      render: (_: unknown, record: HotProduct) => (
        <div className="text-xs leading-5 text-gray-600">
          <div>浏览 {record.trustedViewCount30d ?? 0}</div>
          <div>点击 {record.trustedClickCount30d ?? 0}</div>
          <div>CTR {(Number(record.trustedCtr30d || 0) * 100).toFixed(1)}%</div>
        </div>
      ),
    },
    {
      title: '浏览',
      dataIndex: 'viewCount',
      width: 80,
      sorter: (a: HotProduct, b: HotProduct) => a.viewCount - b.viewCount,
    },
    {
      title: '点击',
      dataIndex: 'clickCount',
      width: 80,
      sorter: (a: HotProduct, b: HotProduct) => a.clickCount - b.clickCount,
    },
    {
      title: '外跳',
      dataIndex: 'salesCount',
      width: 80,
      sorter: (a: HotProduct, b: HotProduct) => a.salesCount - b.salesCount,
    },
    {
      title: '收藏',
      dataIndex: 'favoriteCount',
      width: 80,
      sorter: (a: HotProduct, b: HotProduct) => a.favoriteCount - b.favoriteCount,
    },
    {
      title: 'CTR',
      dataIndex: 'ctr',
      width: 80,
      render: (ctr: number | string) => `${(Number(ctr ?? 0) * 100).toFixed(1)}%`,
    },
    {
      title: 'QC',
      dataIndex: 'qcPhotoCount',
      width: 180,
      align: 'center' as const,
      render: (count?: number) => {
        const qcCount = count || 0;
        const status =
          qcCount === 0
            ? { label: '无 QC', color: 'default' as const }
            : qcCount < 3
              ? { label: '待补', color: 'gold' as const }
              : { label: '已完善', color: 'blue' as const };

        return (
          <Space size={4} wrap>
            <Tag color={qcCount > 0 ? 'blue' : 'default'}>{qcCount}</Tag>
            <Tag color={status.color}>{status.label}</Tag>
          </Space>
        );
      },
    },
    {
      title: '推荐',
      dataIndex: 'isFeatured',
      width: 80,
      render: (isFeatured: boolean, record: HotProduct) => (
        <Button
          type="text"
          icon={isFeatured ? <StarFilled className="text-yellow-500" /> : <StarOutlined />}
          onClick={() => handleToggleFeatured(record.id)}
        />
      ),
    },
    {
      title: '优先级',
      key: 'priority',
      width: 170,
      render: (_: unknown, record: HotProduct) => {
        const priority = getProductPriority(record);
        return (
          <Space size={4} wrap>
            <Tag color={priority.color}>{priority.level}</Tag>
            <span className="text-xs text-gray-500">{priority.reason}</span>
          </Space>
        );
      },
    },
    {
      title: '排序',
      dataIndex: 'featuredSort',
      width: 90,
      render: (featuredSort: number, record: HotProduct) => {
        if (!record.isFeatured) return <span className="text-gray-300">-</span>;
        return (
          <InputNumber
            key={`${record.id}-${featuredSort}`}
            size="small"
            min={0}
            defaultValue={featuredSort}
            disabled={savingId === record.id}
            style={{ width: 70 }}
            onBlur={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val !== featuredSort) {
                handleSortChange(record.id, val);
              }
            }}
            onPressEnter={(e) => {
              const val = parseInt((e.target as HTMLInputElement).value, 10);
              if (!isNaN(val) && val !== featuredSort) {
                handleSortChange(record.id, val);
              }
            }}
          />
        );
      },
    },
    {
      title: '上架天数',
      dataIndex: 'createdAt',
      width: 90,
      render: (createdAt: string) => {
        const days = getDaysOnShelf(createdAt);
        return days <= 7 ? <Tag color="green">{days}天</Tag> : <span>{days}天</span>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 170,
      render: (_: unknown, record: HotProduct) => (
        <Space size="small" wrap>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => goToEdit(record.id)}
          >
            编辑
          </Button>
          <Button
            size="small"
            icon={<PictureOutlined />}
            onClick={() => setQcEditorProduct(record)}
          >
            上传 QC
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">热门商品管理</h1>
        <span className="text-sm text-gray-500">
          <StarFilled className="text-yellow-500" /> 推荐商品将置顶显示（数字越小越靠前）
        </span>
      </div>

      <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <div className="font-medium">商品浏览/点击目前仍是历史累计字段</div>
        <div className="mt-1">
          这张表里的浏览、点击、CTR 包含历史遗留累计值。可信判断请优先看“可信 30d”，热度分也已开始按近 30 天可信浏览/点击重算；旧累计字段暂时只保留作历史参考。
        </div>
      </div>

      {alerts.length > 0 ? (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <div className="font-medium">自动告警</div>
          <div className="mt-2 space-y-2">
            {alerts.slice(0, 3).map((alert) => (
              <div key={alert.id}>
                <div className="font-medium">
                  {alert.severity === 'high' ? '高优先级' : '中优先级'}: {alert.title}
                </div>
                <div>{alert.description}</div>
                {alert.reasons.length > 0 ? (
                  <div className="text-xs text-red-700">{alert.reasons.join(' / ')}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <Card className="mb-4 admin-product-filters">
        <Space wrap>
          <Input
            placeholder="按商品名称搜索..."
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            onPressEnter={fetchProducts}
            allowClear
          />
          <Select
            placeholder="QC 图"
            style={{ width: 150 }}
            allowClear
            value={qcState || undefined}
            onChange={(value) => {
              setQcState(value === 'with' || value === 'without' ? value : '');
              setPage(1);
            }}
            options={[
              { label: '全部 QC', value: '' },
              { label: '有 QC 图', value: 'with' },
              { label: '无 QC 图', value: 'without' },
            ]}
          />
          <Select
            placeholder="推荐状态"
            style={{ width: 150 }}
            allowClear
            value={featuredState || undefined}
            onChange={(value) => {
              setFeaturedState(
                value === 'featured' || value === 'not_featured' ? value : '',
              );
              setPage(1);
            }}
            options={[
              { label: '全部推荐', value: '' },
              { label: '仅推荐', value: 'featured' },
              { label: '仅未推荐', value: 'not_featured' },
            ]}
          />
          <Select
            placeholder="上架天数"
            style={{ width: 160 }}
            allowClear
            value={shelfDays || undefined}
            onChange={(value) => {
              setShelfDays(
                value === '7' || value === '8_30' || value === '30_plus'
                  ? value
                  : '',
              );
              setPage(1);
            }}
            options={[
              { label: '全部上架天数', value: '' },
              { label: '7 天内', value: '7' },
              { label: '8-30 天', value: '8_30' },
              { label: '30 天以上', value: '30_plus' },
            ]}
          />
          <Button type="primary" onClick={fetchProducts}>搜索</Button>
          <Button onClick={resetFilters}>重置</Button>
        </Space>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
          <span className="text-sm font-medium text-gray-500">运营快筛</span>
          <Button
            size="small"
            type={quickFilterFeaturedWithoutQcActive ? 'primary' : 'default'}
            onClick={() => {
              if (quickFilterFeaturedWithoutQcActive) {
                setFeaturedState('');
                setQcState('');
                setQcLevel('');
                setMinPopularityScore(null);
              } else {
                setFeaturedState('featured');
                setQcState('without');
                setQcLevel('');
                setMinPopularityScore(null);
              }
              setPage(1);
            }}
          >
            推荐但无 QC
          </Button>
          <Button
            size="small"
            type={quickFilterHighHeatWithoutQcActive ? 'primary' : 'default'}
            onClick={() => {
              if (quickFilterHighHeatWithoutQcActive) {
                setQcState('');
                setMinPopularityScore(null);
              } else {
                setQcState('without');
                setQcLevel('');
                setMinPopularityScore(HIGH_HEAT_THRESHOLD);
              }
              setPage(1);
            }}
          >
            高热无 QC
          </Button>
          <Button
            size="small"
            type={quickFilterQcLessThan3Active ? 'primary' : 'default'}
            onClick={() => {
              if (quickFilterQcLessThan3Active) {
                setQcState('');
                setQcLevel('');
              } else {
                setQcState('with');
                setQcLevel('lt3');
                setMinPopularityScore(null);
              }
              setPage(1);
            }}
          >
            QC 1-2 张
          </Button>
          <Button
            size="small"
            type={showCurrentPageWithoutQcOnly ? 'primary' : 'default'}
            onClick={() => setShowCurrentPageWithoutQcOnly((prev) => !prev)}
          >
            本页无 QC ({currentPageWithoutQcCount})
          </Button>
          {showCurrentPageWithoutQcOnly && (
            <Tag color="processing">当前仅筛选本页无 QC</Tag>
          )}
          {minPopularityScore != null && (
            <Tag color="purple">高热阈值 ≥ {minPopularityScore.toFixed(2)}</Tag>
          )}
        </div>

        <div className="mt-3 rounded border border-gray-100 bg-gray-50 p-3">
          <div className="text-sm font-medium text-gray-600">全部页统计</div>
          <div className="mt-1 text-xs text-gray-400">基于当前查询条件，覆盖全部分页结果</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Tag color="blue">筛选结果 {total} 条</Tag>
            <Tag color={summary.withoutQc > 0 ? 'gold' : 'default'}>
              无 QC {summary.withoutQc} 条
            </Tag>
            <Tag color={summary.qcLessThan3 > 0 ? 'orange' : 'default'}>
              QC 1-2 张 {summary.qcLessThan3} 条
            </Tag>
            <Tag color={summary.featuredWithoutQc > 0 ? 'red' : 'default'}>
              推荐但无 QC {summary.featuredWithoutQc} 条
            </Tag>
            <Tag color={summary.highHeatWithoutQc > 0 ? 'volcano' : 'default'}>
              高热无 QC {summary.highHeatWithoutQc} 条
            </Tag>
          </div>
        </div>

        <div className="mt-3 rounded border border-gray-100 bg-white p-3">
          <div className="text-sm font-medium text-gray-600">当前页统计</div>
          <div className="mt-1 text-xs text-gray-400">
            基于当前页数据{showCurrentPageWithoutQcOnly ? '，并叠加了“本页无 QC”本地过滤' : ''}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Tag color="cyan">当前页 {products.length} 条</Tag>
            <Tag color={visibleWithoutQcCount > 0 ? 'processing' : 'default'}>
              当前可见无 QC {visibleWithoutQcCount} 条
            </Tag>
            <Tag color={currentPageQcLessThan3Count > 0 ? 'orange' : 'default'}>
              本页 QC 1-2 张 {currentPageQcLessThan3Count} 条
            </Tag>
            <Tag color={currentPageFeaturedWithoutQcCount > 0 ? 'red' : 'default'}>
              本页推荐但无 QC {currentPageFeaturedWithoutQcCount} 条
            </Tag>
            <Tag color={currentPageHighHeatWithoutQcCount > 0 ? 'volcano' : 'default'}>
              本页高热无 QC {currentPageHighHeatWithoutQcCount} 条
            </Tag>
          </div>
        </div>
      </Card>

      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={visibleProducts}
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) =>
              `共 ${t} 个商品，当前可见 ${visibleProducts.length} 个${showCurrentPageWithoutQcOnly ? '（当前页已过滤无 QC）' : ''}`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
          scroll={{ x: 1800 }}
          tableLayout="fixed"
          size="middle"
        />
      </Card>

      <AdminQcImageEditor
        open={Boolean(qcEditorProduct)}
        productId={qcEditorProduct?.id || null}
        productTitle={qcEditorProduct?.title}
        onClose={() => setQcEditorProduct(null)}
        onSaved={fetchProducts}
      />
    </div>
  );
}
