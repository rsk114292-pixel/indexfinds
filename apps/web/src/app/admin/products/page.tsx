'use client';

import dynamic from 'next/dynamic';
import { useState, useMemo, Suspense, useEffect } from 'react';
import useSWR from 'swr';
import {
  Card,
  Input,
  Select,
  Button,
  Space,
  App,
  Tabs,
  Badge,
  InputNumber,
  TreeSelect,
} from 'antd';
import { PlusOutlined, ImportOutlined, SearchOutlined, WarningOutlined } from '@ant-design/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProductTable } from './components/ProductTable';
import { ShopOverviewPanel } from './components/ShopOverviewPanel';
import { fetcher, patch, del, post } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-error';
import { useUrlState } from '@/hooks/useUrlState';
import { TableSkeleton } from '../components/PageSkeleton';
import type {
  AdminProductShopOption,
  AdminProductShopOverview,
  Category,
  Product,
} from '@/types';
import { readSessionCache, writeSessionCache } from '@/lib/session-cache';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import {
  getBatchStatusActions,
  normalizeBatchStatusAction,
} from './batch-status';

type TabKey =
  | 'all'
  | 'review'
  | 'sku-review'
  | 'duplicates'
  | 'mixed'
  | 'split'
  | 'deadlink';

const PRODUCTS_CACHE_TTL_MS = 5 * 60 * 1000;
const LazyReviewList = dynamic(
  () => import('./review/components/ReviewList').then((mod) => mod.ReviewList),
  { loading: () => <TableSkeleton /> },
);
const LazyDuplicatesList = dynamic(
  () => import('./duplicates/components/DuplicatesList').then((mod) => mod.DuplicatesList),
  { loading: () => <TableSkeleton /> },
);
const LazyMixedProductList = dynamic(
  () => import('./mixed/components/MixedProductList').then((mod) => mod.MixedProductList),
  { loading: () => <TableSkeleton /> },
);

interface CategoryTreeNode {
  value: string;
  title: string;
  children?: CategoryTreeNode[];
}

type BatchScope = 'selected' | 'group';

type ProductListQueryState = {
  page: number;
  limit: number;
  search: string;
  status: string;
  priceState: string;
  qcState: string;
  minPrice: string;
  maxPrice: string;
  shopIds: string;
};

const PRODUCT_LIST_QUERY_DEFAULTS: ProductListQueryState = {
  page: 1,
  limit: 20,
  search: '',
  status: '',
  priceState: '',
  qcState: '',
  minPrice: '',
  maxPrice: '',
  shopIds: '',
};

function transformCategories(categories: Category[]): CategoryTreeNode[] {
  return categories.map((category) => ({
    value: category.id,
    title: category.name,
    children: category.children
      ? transformCategories(category.children)
      : undefined,
  }));
}

function collectLeafCategoryIds(
  categories: Category[],
  leafCategoryIds = new Set<string>(),
): Set<string> {
  categories.forEach((category) => {
    if (category.children?.length) {
      collectLeafCategoryIds(category.children, leafCategoryIds);
      return;
    }

    leafCategoryIds.add(category.id);
  });

  return leafCategoryIds;
}

/** 把查询参数构建为 SWR key（URL 字符串） */
function buildAdminKey(basePath: string, params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function buildProductsKey(params: Record<string, unknown>): string {
  return buildAdminKey('/admin/products', params);
}

// ── 产品表格 Tab 内容（全部 / 已拆分共用）──
function ProductListTab({
  fixedStatus,
  fixedReviewSource,
}: {
  fixedStatus?: string;
  fixedReviewSource?: 'sku_split';
}) {
  const { message, modal } = App.useApp();
  const { isReady } = useAdminAuthReady();
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [batchCategoryId, setBatchCategoryId] = useState<string>();
  const [batchScope, setBatchScope] = useState<BatchScope>('selected');
  const [shopSearch, setShopSearch] = useState('');
  const [cachedData, setCachedData] = useState<{ data: Product[]; meta?: { total: number } } | null>(null);
  const shouldShowBatchCategory =
    fixedStatus === 'pending_review' && fixedReviewSource === 'sku_split';

  // 仅"全部"Tab 使用 URL 持久化（preserveKeys 保留 tab/jobId 不被覆盖）
  const urlState = useUrlState(PRODUCT_LIST_QUERY_DEFAULTS, {
    preserveKeys: ['tab', 'jobId'],
  });

  // 已拆分 Tab 使用本地状态
  const [localQuery, setLocalQuery] = useState<ProductListQueryState>({
    ...PRODUCT_LIST_QUERY_DEFAULTS,
  });

  const useUrl = !fixedStatus;
  const query = useUrl ? urlState.params : localQuery;
  const setQuery = useUrl
    ? (updates: Partial<ProductListQueryState>) => urlState.setParams(updates)
    : (updates: Partial<ProductListQueryState>) =>
        setLocalQuery((prev) => ({ ...prev, ...updates }));

  const selectedShopIds = useMemo(
    () =>
      String(query.shopIds || '')
        .split(',')
        .map((shopId) => shopId.trim())
        .filter(Boolean),
    [query.shopIds],
  );

  const swrKey = useMemo(
    () =>
      isReady
        ? buildProductsKey({
            page: query.page,
            limit: query.limit,
            search: query.search || undefined,
            status: fixedStatus || query.status || undefined,
            priceState: query.priceState || undefined,
            qcState: query.qcState || undefined,
            minPrice: query.minPrice || undefined,
            maxPrice: query.maxPrice || undefined,
            shopIds: query.shopIds || undefined,
            reviewSource: fixedReviewSource,
          })
        : null,
    [
      isReady,
      query.page,
      query.limit,
      query.search,
      query.status,
      query.priceState,
      query.qcState,
      query.minPrice,
      query.maxPrice,
      query.shopIds,
      fixedStatus,
      fixedReviewSource,
    ],
  );

  const shopAggregationParams = useMemo(
    () => ({
      search: query.search || undefined,
      status: fixedStatus || query.status || undefined,
      priceState: query.priceState || undefined,
      qcState: query.qcState || undefined,
      minPrice: query.minPrice || undefined,
      maxPrice: query.maxPrice || undefined,
      reviewSource: fixedReviewSource,
    }),
    [
      query.search,
      query.status,
      query.priceState,
      query.qcState,
      query.minPrice,
      query.maxPrice,
      fixedStatus,
      fixedReviewSource,
    ],
  );

  const shopOverviewKey = useMemo(
    () =>
      isReady
        ? buildAdminKey('/admin/products/shop-options', {
            ...shopAggregationParams,
            limit: 8,
          })
        : null,
    [isReady, shopAggregationParams],
  );

  const shopOptionsKey = useMemo(
    () =>
      isReady
        ? buildAdminKey('/admin/products/shop-options', {
            ...shopAggregationParams,
            limit: 50,
            shopSearch: shopSearch || undefined,
          })
        : null,
    [isReady, shopAggregationParams, shopSearch],
  );

  const { data, isLoading, mutate } = useSWR<{ data: Product[]; meta?: { total: number } }>(
    swrKey, fetcher,
    { keepPreviousData: true, revalidateOnFocus: false },
  );
  const {
    data: shopOverviewData,
    isLoading: isShopOverviewLoading,
    error: shopOverviewError,
  } =
    useSWR<AdminProductShopOverview>(shopOverviewKey, fetcher, {
      keepPreviousData: true,
      revalidateOnFocus: false,
    });
  const {
    data: shopOptionsData,
    isLoading: isShopOptionsLoading,
    error: shopOptionsError,
  } =
    useSWR<AdminProductShopOverview>(shopOptionsKey, fetcher, {
      keepPreviousData: true,
      revalidateOnFocus: false,
    });
  const { data: categoriesData } = useSWR<Category[] | { data?: Category[] }>(
    isReady && shouldShowBatchCategory ? '/categories?includeLegacy=false' : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    if (!swrKey) return;
    setCachedData(
      readSessionCache<{ data: Product[]; meta?: { total: number } }>(
        `admin:products:${swrKey}`,
        PRODUCTS_CACHE_TTL_MS,
      ),
    );
  }, [swrKey]);

  useEffect(() => {
    if (data) {
      writeSessionCache(`admin:products:${swrKey}`, data);
    }
  }, [data, swrKey]);

  const displayData = data || cachedData;
  const products = displayData?.data || [];
  const total = displayData?.meta?.total || 0;
  const categories = useMemo(
    () =>
      Array.isArray(categoriesData) ? categoriesData : categoriesData?.data || [],
    [categoriesData],
  );

  const selectedProducts = products.filter((product) =>
    selectedRowKeys.includes(product.id),
  );
  const batchActions = getBatchStatusActions(fixedStatus);
  const selectedGroupCount = useMemo(
    () =>
      new Set(
        selectedProducts.map((product) => product.productGroupId || product.id),
      ).size,
    [selectedProducts],
  );
  const categoryTreeData = useMemo(
    () => transformCategories(categories),
    [categories],
  );
  const leafCategoryIds = useMemo(
    () => collectLeafCategoryIds(categories),
    [categories],
  );
  const shopOverviewErrorMessage = shopOverviewError
    ? getErrorMessage(shopOverviewError)
    : undefined;
  const shopOptionsErrorMessage = shopOptionsError
    ? getErrorMessage(shopOptionsError)
    : undefined;
  const shopSelectOptions = useMemo(() => {
    const optionMap = new Map<string, AdminProductShopOption>();
    [...(shopOptionsData?.data || []), ...(shopOverviewData?.data || [])].forEach(
      (shop) => {
        optionMap.set(shop.shopId, shop);
      },
    );

    if (
      (shopOverviewData?.meta.missingProductCount || 0) > 0 &&
      !optionMap.has('unknown')
    ) {
      optionMap.set('unknown', {
        shopId: 'unknown',
        shopName: '未识别店铺',
        productCount: shopOverviewData?.meta.missingProductCount || 0,
        pendingReviewCount: 0,
        withoutQcCount: 0,
        deadLinkCount: 0,
      });
    }

    selectedShopIds.forEach((shopId) => {
      if (!optionMap.has(shopId)) {
        optionMap.set(shopId, {
          shopId,
          shopName: shopId === 'unknown' ? '未识别店铺' : shopId,
          productCount: 0,
          pendingReviewCount: 0,
          withoutQcCount: 0,
          deadLinkCount: 0,
        });
      }
    });

    return Array.from(optionMap.values()).map((shop) => ({
      value: shop.shopId,
      label:
        shop.shopId === 'unknown'
          ? `未识别店铺 (${shop.productCount})`
          : `${shop.shopName} (${shop.productCount})`,
    }));
  }, [selectedShopIds, shopOptionsData?.data, shopOverviewData?.data]);
  const selectedCategoryIsLeaf =
    !!batchCategoryId && leafCategoryIds.has(batchCategoryId);

  const handleDelete = async (id: string) => {
    try {
      await del(`/products/${id}`);
      message.success('产品已删除');
      mutate();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '删除产品失败');
      mutate();
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await patch(`/products/${id}`, { status });
      message.success('状态已更新');
      mutate();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '更新状态失败');
    }
  };

  const updateShopFilter = (nextShopIds: string[]) => {
    setQuery({ shopIds: nextShopIds.join(','), page: 1 });
  };

  const handleQuickShopFilter = (shopId: string) => {
    if (selectedShopIds.length === 1 && selectedShopIds[0] === shopId) {
      updateShopFilter([]);
      return;
    }

    updateShopFilter([shopId]);
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择产品');
      return;
    }
    modal.confirm({
      title: `确定删除 ${selectedRowKeys.length} 个产品？`,
      onOk: async () => {
        try {
          const result = await post<{ success: string[]; failed: Array<{ id: string; reason: string }> }>(
            '/products/batch-delete',
            { ids: selectedRowKeys },
          );
          if (result?.failed?.length > 0) {
            message.warning(`已删除 ${result.success.length} 个，${result.failed.length} 个失败`);
          } else {
            message.success(`已删除 ${selectedRowKeys.length} 个产品`);
          }
          setSelectedRowKeys([]);
          mutate();
        } catch (err: unknown) {
          message.error(err instanceof Error ? err.message : '批量删除失败');
          mutate();
        }
      },
    });
  };

  const handleBatchStatusChange = async (action: string) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择产品');
      return;
    }

    const normalizedAction = normalizeBatchStatusAction(action, selectedProducts);

    try {
      const result = await post<{ success: string[]; failed: Array<{ id: string; reason: string }> }>(
        '/products/batch-status',
        {
          ids: selectedRowKeys,
          action: normalizedAction,
          allowParentCategory:
            shouldShowBatchCategory && normalizedAction === 'approve',
        },
      );
      if (result?.failed?.length > 0) {
        message.warning(`${result.success.length} 个成功，${result.failed.length} 个失败`);
      } else {
        message.success('状态已更新');
      }
      setSelectedRowKeys([]);
      mutate();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '批量状态更新失败');
    }
  };

  const runBatchCategoryChange = async (approveAfterUpdate = false) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择产品');
      return;
    }
    if (!batchCategoryId) {
      message.warning('请先选择分类');
      return;
    }
    try {
      const result = await post<{
        success: string[];
        failed: Array<{ id: string; reason: string }>;
      }>('/products/batch-category', {
        ids: selectedRowKeys,
        primaryCategoryId: batchCategoryId,
        scope: batchScope,
        approveAfterUpdate,
        allowParentCategory: shouldShowBatchCategory && approveAfterUpdate,
      });

      if (result?.failed?.length > 0) {
        message.warning(
          approveAfterUpdate
            ? `已处理 ${result.success.length} 个，${result.failed.length} 个失败`
            : `已更新 ${result.success.length} 个，${result.failed.length} 个失败`,
        );
      } else {
        message.success(
          approveAfterUpdate
            ? `已完成 ${result.success.length} 个商品的改分类并通过审核`
            : `已更新 ${result.success.length} 个商品的分类`,
        );
      }

      setSelectedRowKeys([]);
      setBatchCategoryId(undefined);
      mutate();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '批量分类更新失败');
    }
  };

  const handleBatchCategoryChange = (approveAfterUpdate = false) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择产品');
      return;
    }
    if (!batchCategoryId) {
      message.warning('请先选择分类');
      return;
    }

    const scopeLabel =
      batchScope === 'group'
        ? `按 ${selectedGroupCount} 个 productGroupId 整组处理`
        : `仅处理已选中的 ${selectedRowKeys.length} 个商品`;
    const actionLabel = approveAfterUpdate ? '批量改分类并通过审核' : '批量改分类';
    const categoryDepthLabel = selectedCategoryIsLeaf ? '子分类' : '父分类';

    modal.confirm({
      title: `确认${actionLabel}？`,
      content: approveAfterUpdate
        ? `${scopeLabel}。当前选择的是${categoryDepthLabel}，会先更新主分类，再执行人工审核通过。`
        : `${scopeLabel}。`,
      onOk: () => runBatchCategoryChange(approveAfterUpdate),
    });
  };

  return (
    <>
      <Card className="mb-4 admin-product-filters">
        <Space wrap>
          <Input
            placeholder="按标题搜索..."
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            value={query.search || ''}
            onChange={(e) => setQuery({ search: e.target.value, page: 1 })}
            onPressEnter={() => mutate()}
          />
          {!fixedStatus && (
            <Select
              placeholder="状态"
              style={{ width: 150 }}
              allowClear
              value={query.status || undefined}
              onChange={(value) => setQuery({ status: value || '', page: 1 })}
              options={[
                { label: '全部', value: 'all' },
                { label: '已上架', value: 'active' },
                { label: '已下架', value: 'inactive' },
                { label: '待审核', value: 'pending_review' },
                { label: '草稿', value: 'draft' },
                { label: '已拆分', value: 'split' },
              ]}
            />
          )}
          <Select
            placeholder="价格"
            style={{ width: 150 }}
            allowClear
            value={query.priceState || undefined}
            onChange={(value) => setQuery({ priceState: value || '', page: 1 })}
            options={[
              { label: '全部价格', value: 'all' },
              { label: '0 元异常', value: 'zero' },
              { label: '有价格', value: 'priced' },
            ]}
          />
          <Select
            placeholder="QC 图"
            style={{ width: 150 }}
            allowClear
            value={query.qcState || undefined}
            onChange={(value) => setQuery({ qcState: value || '', page: 1 })}
            options={[
              { label: '全部 QC', value: 'all' },
              { label: '有 QC 图', value: 'with' },
              { label: '无 QC 图', value: 'without' },
            ]}
          />
          <InputNumber
            placeholder="最低价"
            min={0}
            style={{ width: 120 }}
            value={query.minPrice === '' ? null : Number(query.minPrice)}
            onChange={(value) => setQuery({ minPrice: value == null ? '' : String(value), page: 1 })}
          />
          <InputNumber
            placeholder="最高价"
            min={0}
            style={{ width: 120 }}
            value={query.maxPrice === '' ? null : Number(query.maxPrice)}
            onChange={(value) => setQuery({ maxPrice: value == null ? '' : String(value), page: 1 })}
          />
          <Select
            mode="multiple"
            allowClear
            showSearch
            filterOption={false}
            placeholder="来源店铺"
            style={{ width: 320 }}
            value={selectedShopIds.length > 0 ? selectedShopIds : undefined}
            options={shopSelectOptions}
            loading={isShopOptionsLoading}
            status={shopOptionsErrorMessage ? 'error' : undefined}
            onSearch={setShopSearch}
            onChange={(value) => updateShopFilter(value)}
            onClear={() => updateShopFilter([])}
            maxTagCount={1}
            maxTagTextLength={14}
            maxTagPlaceholder={(omittedValues) => `+${omittedValues.length}`}
            notFoundContent={
              shopOptionsErrorMessage
                ? `店铺加载失败：${shopOptionsErrorMessage}`
                : shopSearch
                  ? '未找到匹配店铺'
                  : '暂无店铺'
            }
          />
          <Button type="primary" onClick={() => mutate()}>
            搜索
          </Button>
        </Space>
      </Card>

      <ShopOverviewPanel
        data={shopOverviewData}
        loading={isShopOverviewLoading}
        errorMessage={shopOverviewErrorMessage}
        selectedShopIds={selectedShopIds}
        onSelectShop={handleQuickShopFilter}
        onClear={() => updateShopFilter([])}
      />

      {selectedRowKeys.length > 0 && (
        <Card className="mb-4">
          <Space wrap>
            <span>已选择 {selectedRowKeys.length} 项</span>
            {batchActions.map((batchAction) => (
              <Button
                key={batchAction.action}
                type={batchAction.type}
                onClick={() => handleBatchStatusChange(batchAction.action)}
              >
                {batchAction.label}
              </Button>
            ))}
            <Button danger onClick={handleBatchDelete}>删除</Button>
            {shouldShowBatchCategory && (
              <>
                <Select
                  style={{ width: 220 }}
                  value={batchScope}
                  onChange={(value) => setBatchScope(value as BatchScope)}
                  options={[
                    { label: '仅改选中商品', value: 'selected' },
                    { label: '按 productGroupId 整组改', value: 'group' },
                  ]}
                />
                <TreeSelect
                  showSearch
                  allowClear
                  style={{ width: 320 }}
                  placeholder="批量设置主分类"
                  treeData={categoryTreeData}
                  treeDefaultExpandAll
                  value={batchCategoryId}
                  onChange={(value) =>
                    setBatchCategoryId(
                      typeof value === 'string' ? value : undefined,
                    )
                  }
                />
                <Button onClick={() => handleBatchCategoryChange()}>
                  批量改分类
                </Button>
                <Button
                  type="primary"
                  onClick={() => handleBatchCategoryChange(true)}
                >
                  改分类并通过审核
                </Button>
              </>
            )}
            {shouldShowBatchCategory && (
              <span className="text-xs text-amber-600">
                人工审核可直接以上级父分类上架；自动链路仍然要求叶子分类。
              </span>
            )}
          </Space>
        </Card>
      )}

      <Card>
        <ProductTable
          data={products}
          loading={!isReady || (isLoading && !displayData)}
          pagination={{
            current: query.page,
            pageSize: query.limit,
            total,
          }}
          onPageChange={(page, pageSize) => setQuery({ page, limit: pageSize })}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          selectedRowKeys={selectedRowKeys}
          onSelectChange={setSelectedRowKeys}
          onShopFilter={handleQuickShopFilter}
        />
      </Card>
    </>
  );
}

// ── 死链产品 Tab ──
function DeadLinkTab({ type }: { type: 'suspected' | 'confirmed' }) {
  const { modal, message } = App.useApp();
  const { isReady } = useAdminAuthReady();
  const [page, setPage] = useState(1);
  const [cachedData, setCachedData] = useState<{ data: Product[]; meta?: { total: number } } | null>(null);
  const swrKey = isReady
    ? `/admin/products?page=${page}&limit=20&deadLink=${type}`
    : null;

  const { data, isLoading, mutate } = useSWR<{ data: Product[]; meta?: { total: number } }>(
    swrKey,
    fetcher,
    { keepPreviousData: true, revalidateOnFocus: false },
  );

  useEffect(() => {
    if (!swrKey) return;
    setCachedData(
      readSessionCache<{ data: Product[]; meta?: { total: number } }>(
        `admin:products:${swrKey}`,
        PRODUCTS_CACHE_TTL_MS,
      ),
    );
  }, [swrKey]);

  useEffect(() => {
    if (data) {
      writeSessionCache(`admin:products:${swrKey}`, data);
    }
  }, [data, swrKey]);

  const displayData = data || cachedData;
  const products = displayData?.data || [];
  const total = displayData?.meta?.total || 0;

  const handleReset = (productId: string) => {
    modal.confirm({
      title: '确认标记为误判？',
      content: '将重置该产品的死链状态，下次缓存刷新时重新检测。',
      onOk: async () => {
        try {
          await post(`/weidian/dead-links/${productId}/reset`, {});
          message.success('已重置死链状态');
          mutate();
        } catch (err: unknown) {
          message.error(err instanceof Error ? err.message : '重置失败');
        }
      },
    });
  };

  return (
    <Card>
      <ProductTable
        data={products}
        loading={!isReady || (isLoading && !displayData)}
        pagination={{ current: page, pageSize: 20, total }}
        onPageChange={(p) => setPage(p)}
        onDelete={async () => {}}
        onStatusChange={async () => {}}
        selectedRowKeys={[]}
        onSelectChange={() => {}}
        extraActions={(record) => (
          <Button
            size="small"
            onClick={() => handleReset(record.id)}
          >
            误判重置
          </Button>
        )}
      />
    </Card>
  );
}

interface TabCounts {
  review: number;
  skuSplitReview: number;
  duplicates: number;
  mixed: number;
  split: number;
  deadLinkConfirmed: number;
}

// ── 主页面 ──
function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isReady } = useAdminAuthReady();
  const activeTab = (searchParams.get('tab') as TabKey) || 'all';
  const jobId = searchParams.get('jobId');
  const [cachedTabCounts, setCachedTabCounts] = useState<TabCounts | null>(null);

  // Tab 计数（单个轻量接口，30s 去重）
  const { data: tabCounts } = useSWR<TabCounts>(
    isReady ? '/admin/products/tab-counts' : null, fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  );

  useEffect(() => {
    setCachedTabCounts(
      readSessionCache<TabCounts>('admin:products:tab-counts', PRODUCTS_CACHE_TTL_MS),
    );
  }, []);

  useEffect(() => {
    if (tabCounts) {
      writeSessionCache('admin:products:tab-counts', tabCounts);
    }
  }, [tabCounts]);

  const displayTabCounts = tabCounts || cachedTabCounts;

  const counts = {
    review: displayTabCounts?.review ?? 0,
    skuSplitReview: displayTabCounts?.skuSplitReview ?? 0,
    duplicates: displayTabCounts?.duplicates ?? 0,
    mixed: displayTabCounts?.mixed ?? 0,
    split: displayTabCounts?.split ?? 0,
    deadLinkConfirmed: displayTabCounts?.deadLinkConfirmed ?? 0,
  };

  if (!isReady) {
    return <TableSkeleton />;
  }

  const handleTabChange = (key: string) => {
    // 切换 Tab 时清除其他 Tab 的筛选参数，只保留 tab
    const params = new URLSearchParams();
    if (key !== 'all') params.set('tab', key);
    const qs = params.toString();
    router.push(`/admin/products${qs ? `?${qs}` : ''}`);
  };

  const tabItems = [
    {
      key: 'all',
      label: '全部',
      children: <ProductListTab />,
    },
    {
      key: 'review',
      label: <Badge count={counts.review} offset={[10, 0]} size="small">普通上传待审核</Badge>,
      children: <LazyReviewList jobId={jobId} />,
    },
    {
      key: 'sku-review',
      label: (
        <Badge count={counts.skuSplitReview} offset={[10, 0]} size="small" showZero={false}>
          SKU拆分待审核
        </Badge>
      ),
      children: (
        <ProductListTab
          fixedStatus="pending_review"
          fixedReviewSource="sku_split"
        />
      ),
    },
    {
      key: 'duplicates',
      label: <Badge count={counts.duplicates} offset={[10, 0]} size="small" color="orange">疑似重复</Badge>,
      children: <LazyDuplicatesList />,
    },
    {
      key: 'mixed',
      label: <Badge count={counts.mixed} offset={[10, 0]} size="small">混合产品</Badge>,
      children: <LazyMixedProductList />,
    },
    {
      key: 'split',
      label: <Badge count={counts.split} offset={[10, 0]} size="small" showZero={false}>已拆分</Badge>,
      children: <ProductListTab fixedStatus="split" />,
    },
    {
      key: 'deadlink',
      label: (
        <Badge count={counts.deadLinkConfirmed} offset={[10, 0]} size="small" color="red" showZero={false}>
          <Space size={4}>
            <WarningOutlined className="text-orange-500" />
            死链
          </Space>
        </Badge>
      ),
      children: <DeadLinkTab type="confirmed" />,
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">产品管理</h1>
        <Space>
          <Button
            icon={<ImportOutlined />}
            onClick={() => router.push('/admin/products/import')}
          >
            批量导入
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push('/admin/products/new')}
          >
            添加产品
          </Button>
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        destroyOnHidden
      />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <ProductsPageContent />
    </Suspense>
  );
}
