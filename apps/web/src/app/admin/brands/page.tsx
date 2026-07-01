'use client';

import dynamic from 'next/dynamic';
import { useState, useMemo, Suspense, useEffect, useDeferredValue, type Key } from 'react';
import useSWR from 'swr';
import {
  Card,
  Input,
  Button,
  Space,
  App,
  Alert,
  Modal,
  Select,
  Table,
  Tag,
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { BrandTable } from './components/BrandTable';
import { BrandCandidateReviewDrawer } from './components/BrandCandidateReviewDrawer';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import { fetcher, get, post, patch, del } from '@/lib/api';
import { useUrlState } from '@/hooks/useUrlState';
import { TableSkeleton } from '../components/PageSkeleton';
import type { Brand, BrandCandidate, BrandCandidateDetail } from '@/types';
import { readSessionCache, writeSessionCache } from '@/lib/session-cache';

const BRANDS_CACHE_TTL_MS = 5 * 60 * 1000;
const LazyBrandForm = dynamic(
  () => import('./components/BrandForm').then((mod) => mod.BrandForm),
  { loading: () => null },
);

const candidateStatusMeta: Record<string, { color: string; label: string }> = {
  pending: { color: 'gold', label: '待审核' },
  approved_alias: { color: 'green', label: '已绑定别名' },
  approved_child: { color: 'cyan', label: '已建子品牌' },
  approved_canonical: { color: 'blue', label: '已建正式品牌' },
  classified_unknown: { color: 'default', label: 'Unknown' },
  classified_inspired: { color: 'volcano', label: 'Inspired' },
  classified_invalid: { color: 'red', label: 'Invalid' },
};

function formatCandidateConfidence(value?: number | null) {
  if (typeof value !== 'number') return '-';
  return `${Math.round(value * 100)}%`;
}

function inferCandidateRiskFlags(candidate: BrandCandidate) {
  const text = `${candidate.rawBrandName} ${candidate.normalizedBrandName}`.toLowerCase();
  const flags: string[] = [];

  if (/(inspired|replica|bootleg|style\b|unofficial|inspo)/.test(text)) {
    flags.push('Inspired 风险');
  }
  if (/(?:\s[x×]\s|collab)/.test(text)) {
    flags.push('联名');
  }
  if (/(records|studio|project|line|lab|atelier|collection)/.test(text)) {
    flags.push('副线');
  }
  if (
    typeof candidate.confidence === 'number' &&
    candidate.confidence > 0 &&
    candidate.confidence < 0.75
  ) {
    flags.push('低置信');
  }
  if (!candidate.suggestedBrandId) {
    flags.push('无建议');
  }

  return flags.slice(0, 3);
}

function BrandsPageContent() {
  const { message } = App.useApp();
  const { isReady } = useAdminAuthReady();
  const { params: query, setParams: setQuery } = useUrlState({ page: 1, limit: 20, search: '' as string, status: '' as string });
  const [formOpen, setFormOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergingBrand, setMergingBrand] = useState<Brand | null>(null);
  const [targetBrandId, setTargetBrandId] = useState<string | null>(null);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [selectedBrandRowKeys, setSelectedBrandRowKeys] = useState<string[]>([]);
  const [selectedBrandMap, setSelectedBrandMap] = useState<Record<string, Brand>>({});
  const [bulkMergeModalOpen, setBulkMergeModalOpen] = useState(false);
  const [bulkMergeTargetBrandId, setBulkMergeTargetBrandId] = useState<string | null>(null);
  const [bulkMergeSubmitting, setBulkMergeSubmitting] = useState(false);
  const [cachedData, setCachedData] = useState<{ data: Brand[]; meta?: { total: number } } | null>(null);
  const [candidatePage, setCandidatePage] = useState(1);
  const [candidateLimit, setCandidateLimit] = useState(20);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateStatus, setCandidateStatus] = useState<string>('');
  const [candidateModalOpen, setCandidateModalOpen] = useState(false);
  const [bindingCandidate, setBindingCandidate] = useState<BrandCandidate | null>(null);
  const [candidateTargetBrandId, setCandidateTargetBrandId] = useState<string | null>(null);
  const [createChildModalOpen, setCreateChildModalOpen] = useState(false);
  const [createChildCandidate, setCreateChildCandidate] = useState<BrandCandidate | null>(null);
  const [createChildBrandName, setCreateChildBrandName] = useState('');
  const [createChildParentBrandId, setCreateChildParentBrandId] = useState<string | null>(null);
  const [createChildRelationType, setCreateChildRelationType] = useState<'parent_child' | 'brand_line'>('parent_child');
  const [createCanonicalModalOpen, setCreateCanonicalModalOpen] = useState(false);
  const [createCanonicalCandidate, setCreateCanonicalCandidate] = useState<BrandCandidate | null>(null);
  const [createCanonicalBrandName, setCreateCanonicalBrandName] = useState('');
  const [candidateActionSubmitting, setCandidateActionSubmitting] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<BrandCandidate | null>(null);
  const [candidateDrawerOpen, setCandidateDrawerOpen] = useState(false);
  const deferredCandidateSearch = useDeferredValue(candidateSearch);

  const swrKey = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set('page', String(query.page));
    sp.set('limit', String(query.limit));
    if (query.search) sp.set('search', query.search);
    if (query.status) sp.set('status', query.status);
    return isReady ? `/brands/admin/list?${sp.toString()}` : null;
  }, [isReady, query.page, query.limit, query.search, query.status]);

  const { data, isLoading, mutate } = useSWR<{ data: Brand[]; meta?: { total: number } }>(
    swrKey, fetcher,
    { keepPreviousData: true, revalidateOnFocus: false },
  );

  const candidateSwrKey = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set('page', String(candidatePage));
    sp.set('limit', String(candidateLimit));
    if (deferredCandidateSearch) sp.set('search', deferredCandidateSearch);
    if (candidateStatus) sp.set('status', candidateStatus);
    return isReady ? `/brands/admin/candidates?${sp.toString()}` : null;
  }, [candidateLimit, candidatePage, candidateStatus, deferredCandidateSearch, isReady]);

  const {
    data: candidateData,
    isLoading: candidatesLoading,
    mutate: mutateCandidates,
  } = useSWR<{ data: BrandCandidate[]; meta?: { total: number } }>(
    candidateSwrKey,
    fetcher,
    { keepPreviousData: true, revalidateOnFocus: false },
  );

  const candidateDetailSwrKey = useMemo(
    () =>
      isReady && selectedCandidate?.id
        ? `/brands/admin/candidates/${selectedCandidate.id}`
        : null,
    [isReady, selectedCandidate?.id],
  );

  const {
    data: candidateDetail,
    isLoading: candidateDetailLoading,
    mutate: mutateCandidateDetail,
  } = useSWR<BrandCandidateDetail>(candidateDetailSwrKey, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  useEffect(() => {
    setCachedData(
      readSessionCache<{ data: Brand[]; meta?: { total: number } }>(
        `admin:brands:${swrKey}`,
        BRANDS_CACHE_TTL_MS,
      ),
    );
  }, [swrKey]);

  useEffect(() => {
    if (data) {
      writeSessionCache(`admin:brands:${swrKey}`, data);
    }
  }, [data, swrKey]);

  const displayData = data || cachedData;
  const brands = displayData?.data || (displayData as unknown as Brand[]) || [];
  const total = displayData?.meta?.total || 0;
  const candidates = candidateData?.data || [];
  const candidateTotal = candidateData?.meta?.total || 0;
  const selectedBrands = useMemo(
    () =>
      selectedBrandRowKeys
        .map((id) => selectedBrandMap[id])
        .filter((brand): brand is Brand => Boolean(brand)),
    [selectedBrandMap, selectedBrandRowKeys],
  );
  const selectedBrandIdSet = useMemo(
    () => new Set(selectedBrandRowKeys),
    [selectedBrandRowKeys],
  );
  const mergeTargetOptions = useMemo(
    () =>
      allBrands
        .filter((brand) => brand.status === 'active' && !selectedBrandIdSet.has(brand.id))
        .map((brand) => ({ value: brand.id, label: brand.name })),
    [allBrands, selectedBrandIdSet],
  );

  const clearBrandSelection = () => {
    setSelectedBrandRowKeys([]);
    setSelectedBrandMap({});
  };

  const removeBrandFromSelection = (brandId: string) => {
    setSelectedBrandRowKeys((current) => current.filter((id) => id !== brandId));
    setSelectedBrandMap((current) => {
      if (!current[brandId]) return current;
      const next = { ...current };
      delete next[brandId];
      return next;
    });
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingBrand(null);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await del(`/brands/${id}`);
      message.success('品牌已删除');
      removeBrandFromSelection(id);
      mutate();
    } catch {
      message.error('删除品牌失败');
    }
  };

  const handleSubmit = async (data: { name: string; aliases?: string[]; tier?: number; logoUrl?: string; description?: string; isFeatured?: boolean; featuredSort?: number }) => {
    setSubmitting(true);
    try {
      // 清理数据：只发送有值的字段，避免后端验证失败
      const cleanedData: Record<string, unknown> = {
        name: data.name,
      };
      // logoUrl 必须是有效的 URL 格式
      const logoUrl = data.logoUrl?.trim();
      if (logoUrl && (logoUrl.startsWith('http://') || logoUrl.startsWith('https://'))) {
        cleanedData.logoUrl = logoUrl;
      }
      if (data.description?.trim()) {
        cleanedData.description = data.description.trim();
      }
      if (data.aliases && data.aliases.length > 0) {
        cleanedData.aliases = data.aliases;
      }
      if (data.tier !== undefined && data.tier !== null) {
        cleanedData.tier = data.tier;
      }
      if (data.isFeatured !== undefined) {
        cleanedData.isFeatured = data.isFeatured;
      }
      if (data.featuredSort !== undefined && data.featuredSort !== null) {
        cleanedData.featuredSort = data.featuredSort;
      }

      if (editingBrand) {
        await patch(`/brands/${editingBrand.id}`, cleanedData);
      } else {
        await post('/brands', cleanedData);
      }
      message.success(editingBrand ? '品牌已更新' : '品牌已创建');
      setFormOpen(false);
      mutate();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存品牌失败');
      throw error; // 重新抛出错误，让表单知道提交失败
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleFeatured = async (brand: Brand) => {
    try {
      await patch(`/brands/${brand.id}`, { isFeatured: !brand.isFeatured });
      message.success(brand.isFeatured ? '已取消精选' : '已设为精选');
      mutate();
    } catch {
      message.error('操作失败');
    }
  };

  const handleUpdateFeaturedSort = async (brand: Brand, sort: number) => {
    try {
      await patch(`/brands/${brand.id}`, { featuredSort: sort });
      message.success(`排序已更新为 ${sort}`);
      mutate();
    } catch {
      message.error('更新排序失败');
    }
  };

  const handleMerge = async (brand: Brand) => {
    setMergingBrand(brand);
    setTargetBrandId(null);

    try {
      await ensureAllBrandsLoaded();
    } catch {
      message.error('加载品牌列表失败');
      return;
    }

    setMergeModalOpen(true);
  };

  const handleMergeConfirm = async () => {
    if (!mergingBrand || !targetBrandId) return;

    try {
      await post(`/brands/${mergingBrand.id}/merge/${targetBrandId}`);
      message.success('品牌合并成功');
      setMergeModalOpen(false);
      removeBrandFromSelection(mergingBrand.id);
      mutate();
    } catch {
      message.error('合并品牌失败');
    }
  };

  const ensureAllBrandsLoaded = async () => {
    if (allBrands.length > 0) return;
    const response = await get<{ data: Brand[] }>('/brands/admin/list', {
      limit: 0,
      status: 'active',
    });
    setAllBrands(response.data || (response as unknown as Brand[]) || []);
  };

  const handleBrandSelectionChange = (nextKeys: Key[], nextRows: Brand[]) => {
    const normalizedKeys = nextKeys.map(String);
    const nextKeySet = new Set(normalizedKeys);

    setSelectedBrandRowKeys(normalizedKeys);
    setSelectedBrandMap((current) => {
      const next = { ...current };
      for (const row of nextRows) {
        next[row.id] = row;
      }
      for (const brandId of Object.keys(next)) {
        if (!nextKeySet.has(brandId)) {
          delete next[brandId];
        }
      }
      return next;
    });
  };

  const handleOpenBulkMerge = async () => {
    setBulkMergeTargetBrandId(null);
    try {
      await ensureAllBrandsLoaded();
    } catch {
      message.error('加载品牌列表失败');
      return;
    }
    setBulkMergeModalOpen(true);
  };

  const handleBulkMergeConfirm = async () => {
    if (!bulkMergeTargetBrandId || selectedBrands.length === 0) return;

    const failures: Array<{ brand: Brand; reason: string }> = [];
    let successCount = 0;

    try {
      setBulkMergeSubmitting(true);
      for (const brand of selectedBrands) {
        try {
          await post(`/brands/${brand.id}/merge/${bulkMergeTargetBrandId}`);
          successCount += 1;
        } catch (error) {
          failures.push({
            brand,
            reason: error instanceof Error ? error.message : '合并失败',
          });
        }
      }

      if (successCount > 0) {
        message.success(`已合并 ${successCount} 个品牌`);
      }

      if (failures.length > 0) {
        Modal.warning({
          title: '部分品牌未合并',
          okText: '知道了',
          content: (
            <div className="space-y-2">
              <div className="text-sm text-gray-500">
                已保留失败项的勾选状态，修正目标品牌后可继续重试。
              </div>
              <div className="max-h-64 overflow-auto text-sm">
                {failures.map(({ brand, reason }) => (
                  <div key={brand.id}>
                    <strong>{brand.name}</strong>: {reason}
                  </div>
                ))}
              </div>
            </div>
          ),
        });
        setSelectedBrandRowKeys(failures.map(({ brand }) => brand.id));
        setSelectedBrandMap(
          failures.reduce<Record<string, Brand>>((acc, { brand }) => {
            acc[brand.id] = brand;
            return acc;
          }, {}),
        );
      } else {
        clearBrandSelection();
      }

      setBulkMergeModalOpen(false);
      mutate();
    } finally {
      setBulkMergeSubmitting(false);
    }
  };

  const handleBindCandidate = async (candidate: BrandCandidate) => {
    setBindingCandidate(candidate);
    setCandidateTargetBrandId(candidate.suggestedBrandId || null);
    try {
      await ensureAllBrandsLoaded();
    } catch {
      message.error('加载品牌列表失败');
      return;
    }
    setCandidateModalOpen(true);
  };

  const handleOpenCreateChild = async (candidate: BrandCandidate) => {
    setCreateChildCandidate(candidate);
    setCreateChildBrandName(candidate.rawBrandName);
    setCreateChildParentBrandId(candidate.suggestedBrandId || null);
    setCreateChildRelationType('parent_child');
    try {
      await ensureAllBrandsLoaded();
    } catch {
      message.error('加载品牌列表失败');
      return;
    }
    setCreateChildModalOpen(true);
  };

  const handleOpenCreateCanonical = (candidate: BrandCandidate) => {
    setCreateCanonicalCandidate(candidate);
    setCreateCanonicalBrandName(candidate.rawBrandName);
    setCreateCanonicalModalOpen(true);
  };

  const handleOpenCandidateEvidence = (candidate: BrandCandidate) => {
    setSelectedCandidate(candidate);
    setCandidateDrawerOpen(true);
  };

  const handleResolveCandidate = async (
    candidate: BrandCandidate,
    action: 'classify_unknown' | 'classify_inspired' | 'classify_invalid',
  ) => {
    try {
      await post(`/brands/admin/candidates/${candidate.id}/resolve`, { action });
      message.success('候选已处理');
      mutateCandidates();
      if (selectedCandidate?.id === candidate.id) {
        mutateCandidateDetail();
      }
    } catch {
      message.error('处理候选失败');
    }
  };

  const handleBindCandidateConfirm = async () => {
    if (!bindingCandidate || !candidateTargetBrandId) return;

    try {
      setCandidateActionSubmitting(true);
      await post(`/brands/admin/candidates/${bindingCandidate.id}/resolve`, {
        action: 'bind_existing',
        brandId: candidateTargetBrandId,
      });
      message.success('候选已绑定到正式品牌');
      setCandidateModalOpen(false);
      mutateCandidates();
      if (selectedCandidate?.id === bindingCandidate.id) {
        mutateCandidateDetail();
      }
      mutate();
    } catch {
      message.error('绑定候选失败');
    } finally {
      setCandidateActionSubmitting(false);
    }
  };

  const handleCreateChildConfirm = async () => {
    if (!createChildCandidate || !createChildParentBrandId || !createChildBrandName.trim()) return;

    try {
      setCandidateActionSubmitting(true);
      await post(`/brands/admin/candidates/${createChildCandidate.id}/resolve`, {
        action: 'create_child',
        brandName: createChildBrandName.trim(),
        parentBrandId: createChildParentBrandId,
        relationType: createChildRelationType,
      });
      message.success('已创建子品牌并回填相关商品');
      setCreateChildModalOpen(false);
      mutateCandidates();
      if (selectedCandidate?.id === createChildCandidate.id) {
        mutateCandidateDetail();
      }
      mutate();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '创建子品牌失败');
    } finally {
      setCandidateActionSubmitting(false);
    }
  };

  const handleCreateCanonicalConfirm = async () => {
    if (!createCanonicalCandidate || !createCanonicalBrandName.trim()) return;

    try {
      setCandidateActionSubmitting(true);
      await post(`/brands/admin/candidates/${createCanonicalCandidate.id}/resolve`, {
        action: 'create_canonical',
        brandName: createCanonicalBrandName.trim(),
      });
      message.success('已创建正式品牌并回填相关商品');
      setCreateCanonicalModalOpen(false);
      mutateCandidates();
      if (selectedCandidate?.id === createCanonicalCandidate.id) {
        mutateCandidateDetail();
      }
      mutate();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '创建正式品牌失败');
    } finally {
      setCandidateActionSubmitting(false);
    }
  };

  const candidateColumns = [
    {
      title: '候选品牌',
      dataIndex: 'rawBrandName',
      key: 'rawBrandName',
      render: (_: string, record: BrandCandidate) => (
        <div>
          <button
            type="button"
            className="p-0 text-left font-medium text-gray-900 hover:text-orange-500"
            onClick={() => handleOpenCandidateEvidence(record)}
          >
            {record.rawBrandName}
          </button>
          <div className="text-xs text-gray-500">{record.normalizedBrandName}</div>
        </div>
      ),
    },
    {
      title: '建议品牌',
      key: 'suggestedBrand',
      width: 180,
      render: (_: unknown, record: BrandCandidate) => {
        if (!record.suggestedBrand?.name) {
          return <span className="text-gray-400">-</span>;
        }

        return (
          <div>
            <div className="font-medium">{record.suggestedBrand.name}</div>
            <div className="text-xs text-gray-500">
              {record.suggestedRelationType || 'soft_hint'}
            </div>
          </div>
        );
      },
    },
    {
      title: '命中数',
      dataIndex: 'hitCount',
      key: 'hitCount',
      width: 100,
    },
    {
      title: '审核线索',
      key: 'signals',
      width: 220,
      render: (_: unknown, record: BrandCandidate) => (
        <div className="space-y-1 text-xs text-gray-500">
          <div>样本商品: {record.sampleProductCount || 0}</div>
          <div>候选置信度: {formatCandidateConfidence(record.confidence)}</div>
          <div>
            建议关系: {record.suggestedRelationType || (record.suggestedBrandId ? 'soft_hint' : '-')}
          </div>
        </div>
      ),
    },
    {
      title: '风险',
      key: 'riskFlags',
      width: 220,
      render: (_: unknown, record: BrandCandidate) => {
        const flags = inferCandidateRiskFlags(record);
        return (
          <Space size={[4, 4]} wrap>
            {flags.length > 0 ? (
              flags.map((flag) => (
                <Tag color={flag === '低置信' ? 'gold' : 'volcano'} key={flag}>
                  {flag}
                </Tag>
              ))
            ) : (
              <Tag color="green">低风险</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'reviewStatus',
      key: 'reviewStatus',
      width: 140,
      render: (value: string) => {
        const meta = candidateStatusMeta[value] || { color: 'blue', label: value };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: '最近出现',
      dataIndex: 'lastSeenAt',
      key: 'lastSeenAt',
      width: 180,
      render: (value?: string | null) => value ? new Date(value).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 340,
      render: (_: unknown, record: BrandCandidate) => (
        <div className="space-y-2">
          <Space wrap>
            <Button size="small" onClick={() => handleOpenCandidateEvidence(record)}>
              查看证据
            </Button>
            <Button size="small" type="primary" onClick={() => handleBindCandidate(record)}>
              绑定现有品牌
            </Button>
          </Space>
          <Space wrap>
            <Button size="small" onClick={() => handleResolveCandidate(record, 'classify_unknown')}>
              Unknown
            </Button>
            <Button size="small" onClick={() => handleResolveCandidate(record, 'classify_inspired')}>
              Inspired
            </Button>
            <Button size="small" danger onClick={() => handleResolveCandidate(record, 'classify_invalid')}>
              Invalid
            </Button>
          </Space>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">品牌管理</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加品牌
        </Button>
      </div>

      <Card className="mb-4">
        <Space>
          <Input
            placeholder="搜索品牌..."
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            value={query.search || ''}
            onChange={(e) => setQuery({ search: e.target.value, page: 1 })}
            onPressEnter={() => mutate()}
          />
          <Select
            placeholder="状态筛选"
            style={{ width: 130 }}
            allowClear
            value={query.status || undefined}
            onChange={(value) => setQuery({ status: value || '', page: 1 })}
            options={[
              { value: 'active', label: '活跃' },
              { value: 'merged', label: '已合并' },
              { value: 'rejected', label: '已拒绝' },
              { value: 'inactive', label: '已删除' },
            ]}
          />
          <Button type="primary" onClick={() => mutate()}>
            搜索
          </Button>
        </Space>
      </Card>

      <Card>
        {selectedBrands.length > 0 && (
          <Alert
            className="mb-4"
            type="info"
            showIcon
            message={`已选择 ${selectedBrands.length} 个品牌`}
            description={
              <div className="flex flex-wrap items-center gap-3">
                <span>批量合并会把这些源品牌统一并到一个目标品牌，适合同一品牌的重复写法治理。</span>
                <Button size="small" type="primary" onClick={handleOpenBulkMerge}>
                  批量合并到目标品牌
                </Button>
                <Button size="small" onClick={clearBrandSelection}>
                  清空选择
                </Button>
              </div>
            }
          />
        )}
        <BrandTable
          data={brands}
          loading={isLoading && !displayData}
          pagination={{ current: query.page, pageSize: query.limit, total }}
          onPageChange={(page, pageSize) => setQuery({ page, limit: pageSize })}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onMerge={handleMerge}
          onToggleFeatured={handleToggleFeatured}
          onUpdateFeaturedSort={handleUpdateFeaturedSort}
          rowSelection={{
            preserveSelectedRowKeys: true,
            selectedRowKeys: selectedBrandRowKeys,
            onChange: handleBrandSelectionChange,
            getCheckboxProps: (record) => ({
              disabled: record.status !== 'active',
            }),
          }}
        />
      </Card>

      <Card className="mt-4" title="品牌候选审核">
        <div className="mb-3 text-sm text-gray-500">
          点候选品牌或“查看证据”进入专家审核抽屉。当前主流程未识别品牌默认会绑定到正式兜底品牌
          {' '}
          <span translate="no">Design</span>
          ，所以这里的候选主要用于处理历史存量、人工修复和例外导入数据。
        </div>
        <Space className="mb-4" wrap>
          <Input
            placeholder="搜索候选品牌..."
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            value={candidateSearch}
            onChange={(e) => {
              setCandidateSearch(e.target.value);
              setCandidatePage(1);
            }}
          />
          <Select
            placeholder="候选状态"
            style={{ width: 180 }}
            allowClear
            value={candidateStatus || undefined}
            onChange={(value) => {
              setCandidateStatus(value || '');
              setCandidatePage(1);
            }}
            options={[
              { value: 'pending', label: '待审核' },
              { value: 'approved_alias', label: '已绑定别名' },
              { value: 'approved_child', label: '已建子品牌' },
              { value: 'approved_canonical', label: '已建正式品牌' },
              { value: 'classified_unknown', label: 'Unknown' },
              { value: 'classified_inspired', label: 'Inspired' },
              { value: 'classified_invalid', label: 'Invalid' },
            ]}
          />
          <Button type="primary" onClick={() => mutateCandidates()}>
            刷新候选
          </Button>
        </Space>

        <Table<BrandCandidate>
          rowKey="id"
          columns={candidateColumns}
          dataSource={candidates}
          loading={candidatesLoading}
          pagination={{
            current: candidatePage,
            pageSize: candidateLimit,
            total: candidateTotal,
            onChange: (page, pageSize) => {
              setCandidatePage(page);
              setCandidateLimit(pageSize);
            },
          }}
        />
      </Card>

      {formOpen && (
        <LazyBrandForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSubmit={handleSubmit}
          brand={editingBrand}
          loading={submitting}
        />
      )}

      <Modal
        title="合并品牌"
        open={mergeModalOpen}
        onCancel={() => setMergeModalOpen(false)}
        onOk={handleMergeConfirm}
        okButtonProps={{ disabled: !targetBrandId }}
      >
        <p className="mb-4">
          将 <strong>{mergingBrand?.name}</strong> 合并到另一个品牌。
          所有产品将转移到目标品牌。
        </p>
        <Select
          placeholder="选择目标品牌"
          style={{ width: '100%' }}
          value={targetBrandId}
          onChange={setTargetBrandId}
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={allBrands
            .filter((b) => b.status === 'active' && b.id !== mergingBrand?.id)
            .map((b) => ({ value: b.id, label: b.name }))}
        />
      </Modal>

      <Modal
        title="批量合并品牌"
        open={bulkMergeModalOpen}
        onCancel={() => setBulkMergeModalOpen(false)}
        onOk={handleBulkMergeConfirm}
        okText="开始合并"
        okButtonProps={{
          disabled: !bulkMergeTargetBrandId || selectedBrands.length === 0,
          loading: bulkMergeSubmitting,
        }}
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-500">
            将以下源品牌统一合并到一个目标品牌。适合同品牌 typo、大小写变体、历史重复建档，不适合父子品牌或副线关系。
          </div>
          <div className="rounded border border-gray-200 bg-gray-50 p-3">
            <div className="mb-2 text-sm font-medium">待合并源品牌</div>
            <div className="flex flex-wrap gap-2">
              {selectedBrands.map((brand) => (
                <Tag key={brand.id}>{brand.name}</Tag>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-sm font-medium">目标品牌</div>
            <Select
              placeholder="选择目标品牌"
              style={{ width: '100%' }}
              value={bulkMergeTargetBrandId}
              onChange={setBulkMergeTargetBrandId}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={mergeTargetOptions}
            />
          </div>
        </div>
      </Modal>

      <Modal
        title="绑定候选到正式品牌"
        open={candidateModalOpen}
        onCancel={() => setCandidateModalOpen(false)}
        onOk={handleBindCandidateConfirm}
        okButtonProps={{ disabled: !candidateTargetBrandId, loading: candidateActionSubmitting }}
      >
        <p className="mb-4">
          将候选 <strong>{bindingCandidate?.rawBrandName}</strong> 绑定到现有正式品牌，并建立别名。
        </p>
        <Select
          placeholder="选择正式品牌"
          style={{ width: '100%' }}
          value={candidateTargetBrandId}
          onChange={setCandidateTargetBrandId}
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={allBrands.map((brand) => ({ value: brand.id, label: brand.name }))}
        />
      </Modal>

      <Modal
        title="创建子品牌"
        open={createChildModalOpen}
        onCancel={() => setCreateChildModalOpen(false)}
        onOk={handleCreateChildConfirm}
        okText="创建并回填"
        okButtonProps={{
          disabled: !createChildParentBrandId || !createChildBrandName.trim(),
          loading: candidateActionSubmitting,
        }}
      >
        <div className="mb-3 text-sm text-gray-500">
          适合“副线 / line / project / 明显挂靠某个主品牌”的候选，不适合同品牌 typo。
        </div>
        <Space direction="vertical" className="w-full" size={12}>
          <div>
            <div className="mb-1 text-sm font-medium">子品牌名称</div>
            <Input
              value={createChildBrandName}
              onChange={(e) => setCreateChildBrandName(e.target.value)}
              placeholder="输入子品牌名称"
            />
          </div>
          <div>
            <div className="mb-1 text-sm font-medium">父品牌</div>
            <Select
              placeholder="选择父品牌"
              style={{ width: '100%' }}
              value={createChildParentBrandId}
              onChange={setCreateChildParentBrandId}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={allBrands.map((brand) => ({ value: brand.id, label: brand.name }))}
            />
          </div>
          <div>
            <div className="mb-1 text-sm font-medium">关系类型</div>
            <Select
              style={{ width: '100%' }}
              value={createChildRelationType}
              onChange={(value) => setCreateChildRelationType(value)}
              options={[
                { value: 'parent_child', label: 'Parent / Child' },
                { value: 'brand_line', label: 'Brand Line' },
              ]}
            />
          </div>
        </Space>
      </Modal>

      <Modal
        title="创建正式品牌"
        open={createCanonicalModalOpen}
        onCancel={() => setCreateCanonicalModalOpen(false)}
        onOk={handleCreateCanonicalConfirm}
        okText="创建并回填"
        okButtonProps={{
          disabled: !createCanonicalBrandName.trim(),
          loading: candidateActionSubmitting,
        }}
      >
        <div className="mb-3 text-sm text-gray-500">
          适合样本商品稳定、类目和来源一致、确认应进入正式 canonical 品牌库的候选。
        </div>
        <Input
          value={createCanonicalBrandName}
          onChange={(e) => setCreateCanonicalBrandName(e.target.value)}
          placeholder="输入正式品牌名称"
        />
      </Modal>

      <BrandCandidateReviewDrawer
        open={candidateDrawerOpen}
        loading={candidateDetailLoading}
        candidate={selectedCandidate}
        detail={candidateDetail?.id === selectedCandidate?.id ? candidateDetail : undefined}
        onClose={() => setCandidateDrawerOpen(false)}
        onBind={handleBindCandidate}
        onCreateChild={handleOpenCreateChild}
        onCreateCanonical={handleOpenCreateCanonical}
        onResolve={handleResolveCandidate}
      />
    </div>
  );
}

export default function BrandsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <BrandsPageContent />
    </Suspense>
  );
}
