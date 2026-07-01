'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useCallback } from 'react';
import { App, Button, Spin, Result, Form } from 'antd';
import { ArrowLeftOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import { get, post } from '@/lib/api';

import type {
  SkuGroupMapping,
  SplitPreview,
  MixedProductDetail,
  ImageGroup,
  SplitResult as SplitResultType,
  GroupMode,
  MergedGroup,
  CustomGroup,
} from './split-tool-types';

const panelSkeleton = () => <div className="h-56 animate-pulse rounded bg-gray-50" />;
const compactSkeleton = () => <div className="h-24 animate-pulse rounded bg-gray-50" />;
const resultSkeleton = () => <div className="h-80 animate-pulse rounded bg-gray-50" />;

const LazySourceProductCard = dynamic(
  () => import('./SourceProductCard').then((mod) => mod.SourceProductCard),
  { loading: panelSkeleton },
);
const LazyAIAnalysisCard = dynamic(
  () => import('./AIAnalysisCard').then((mod) => mod.AIAnalysisCard),
  { loading: compactSkeleton },
);
const LazyGroupsPanel = dynamic(
  () => import('./GroupsPanel').then((mod) => mod.GroupsPanel),
  { loading: panelSkeleton },
);
const LazySKUMappingTable = dynamic(
  () => import('./SKUMappingTable').then((mod) => mod.SKUMappingTable),
  { loading: panelSkeleton },
);
const LazySplitResultView = dynamic(
  () => import('./SplitResultView').then((mod) => mod.SplitResultView),
  { loading: resultSkeleton },
);
const LazyDeletedGroupsBar = dynamic(
  () => import('./DeletedGroupsBar').then((mod) => mod.DeletedGroupsBar),
  { loading: () => null },
);
const LazyActionBar = dynamic(
  () => import('./ActionBar').then((mod) => mod.ActionBar),
  { loading: compactSkeleton },
);
const LazyNewGroupModal = dynamic(
  () => import('./NewGroupModal').then((mod) => mod.NewGroupModal),
  { loading: () => null },
);

interface SplitToolContentProps {
  productId: string;
}

export function SplitToolContent({ productId }: SplitToolContentProps) {
  const { message, modal } = App.useApp();
  const router = useRouter();
  const { isReady, status } = useAdminAuthReady();

  const [loading, setLoading] = useState(true);
  const [splitting, setSplitting] = useState(false);
  const [detail, setDetail] = useState<MixedProductDetail | null>(null);
  const [preview, setPreview] = useState<SplitPreview | null>(null);
  const [mappings, setMappings] = useState<SkuGroupMapping[]>([]);
  const [splitResult, setSplitResult] = useState<SplitResultType | null>(null);

  // 分组模式和手动合并状态
  const [groupMode, setGroupMode] = useState<GroupMode>('byModel');
  const [manualMerges, setManualMerges] = useState<Map<string, string>>(new Map()); // sourceGroupKey -> targetGroupKey

  // 自定义分组状态
  const [customGroups, setCustomGroups] = useState<CustomGroup[]>([]); // 用户新建的分组
  const [deletedGroupKeys, setDeletedGroupKeys] = useState<Set<string>>(new Set()); // 已删除的分组键
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [newGroupForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch both detail and preview in parallel
      const [detailData, previewData] = await Promise.all([
        get<MixedProductDetail>(`/products/${productId}/mixed-detail`),
        get<SplitPreview>(`/products/${productId}/split-preview`),
      ]);
      setDetail(detailData);
      setPreview(previewData);
      setMappings(previewData.suggestedMappings);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '加载产品数据失败'
      );
    } finally {
      setLoading(false);
    }
  }, [productId, message]);

  useEffect(() => {
    if (!isReady) return;
    fetchData();
  }, [fetchData, isReady]);

  // 按图片URL分组SKU（同图片的不同尺码归为一组）
  const groupSkusByImage = useCallback((): ImageGroup[] => {
    if (!detail?.skus) return [];

    const imageMap = new Map<string, ImageGroup>();

    for (const sku of detail.skus) {
      const imageUrl = sku.image || 'no-image';

      if (!imageMap.has(imageUrl)) {
        // 提取颜色/款式属性（通常是第一个非尺码属性）
        const attrs = sku.attributes || {};
        const attrEntries = Object.entries(attrs);
        // 假设第二个属性是颜色/款式（第一个通常是尺码）
        const colorAttr = attrEntries.length > 1
          ? `${attrEntries[1][0]}: ${attrEntries[1][1]}`
          : attrEntries.length > 0
            ? `${attrEntries[0][0]}: ${attrEntries[0][1]}`
            : '未知';

        // 获取当前分组
        const currentMapping = mappings.find((m) => m.skuId === sku.id);

        imageMap.set(imageUrl, {
          imageUrl,
          skuIds: [sku.id],
          sizeCount: 1,
          colorAttr,
          price: sku.price,
          currentGroupKey: currentMapping?.groupKey,
        });
      } else {
        const group = imageMap.get(imageUrl)!;
        group.skuIds.push(sku.id);
        group.sizeCount++;
      }
    }

    return Array.from(imageMap.values());
  }, [detail?.skus, mappings]);

  // 根据分组模式和手动合并生成显示用的分组列表
  const getDisplayGroups = useCallback((): MergedGroup[] => {
    if (!preview?.groups) return [];

    const originalGroups = preview.groups;

    // 步骤1: 根据模式进行基础合并
    let baseGroups: MergedGroup[];

    if (groupMode === 'byBrand') {
      // 按品牌合并
      const brandMap = new Map<string, MergedGroup>();

      for (const group of originalGroups) {
        // 跳过已删除的分组
        if (deletedGroupKeys.has(group.groupKey)) continue;

        const brandKey = group.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        if (!brandMap.has(brandKey)) {
          brandMap.set(brandKey, {
            ...group,
            groupKey: brandKey,
            model: group.brand, // 按品牌合并时，model 显示品牌名
            originalGroupKeys: [group.groupKey],
            mergedFrom: [group.model],
            skuIds: [...group.skuIds],
            imageIndexes: [...group.imageIndexes],
          });
        } else {
          const existing = brandMap.get(brandKey)!;
          existing.originalGroupKeys.push(group.groupKey);
          existing.mergedFrom?.push(group.model);
          existing.skuIds.push(...group.skuIds);
          existing.imageIndexes.push(...new Set(group.imageIndexes));
          // 更新 suggestedTitle 为品牌名 + 类型
          existing.suggestedTitle = `${group.brand} Products Collection`;
        }
      }

      baseGroups = Array.from(brandMap.values());
    } else {
      // 按款式（原始模式）- 排除已删除的分组
      baseGroups = originalGroups
        .filter((g) => !deletedGroupKeys.has(g.groupKey))
        .map((g) => ({
          ...g,
          originalGroupKeys: [g.groupKey],
        }));
    }

    // 步骤2: 应用手动合并
    let finalGroups: MergedGroup[];

    if (manualMerges.size === 0) {
      finalGroups = baseGroups;
    } else {
      finalGroups = [];
      const mergedInto = new Set<string>(); // 被合并到其他分组的 groupKey

      for (const group of baseGroups) {
        // 检查这个分组是否被合并到其他分组
        const targetKey = manualMerges.get(group.groupKey);
        if (targetKey) {
          mergedInto.add(group.groupKey);
          continue;
        }

        // 收集所有合并到这个分组的其他分组
        const mergedGroups = baseGroups.filter(
          (g) => manualMerges.get(g.groupKey) === group.groupKey
        );

        if (mergedGroups.length > 0) {
          // 合并数据
          const merged: MergedGroup = {
            ...group,
            originalGroupKeys: [
              ...group.originalGroupKeys,
              ...mergedGroups.flatMap((g) => g.originalGroupKeys),
            ],
            mergedFrom: [
              ...(group.mergedFrom || [group.model]),
              ...mergedGroups.flatMap((g) => g.mergedFrom || [g.model]),
            ],
            skuIds: [...group.skuIds, ...mergedGroups.flatMap((g) => g.skuIds)],
            imageIndexes: [
              ...new Set([
                ...group.imageIndexes,
                ...mergedGroups.flatMap((g) => g.imageIndexes),
              ]),
            ],
          };
          finalGroups.push(merged);
        } else {
          finalGroups.push(group);
        }
      }
    }

    // 步骤3: 添加用户自定义分组
    for (const custom of customGroups) {
      finalGroups.push({
        ...custom,
        skuIds: [],
        imageIndexes: [],
        originalGroupKeys: [custom.groupKey],
        isCustom: true,
      });
    }

    return finalGroups;
  }, [preview?.groups, groupMode, manualMerges, deletedGroupKeys, customGroups]);

  // 手动合并分组
  const handleMergeGroup = (sourceGroupKey: string, targetGroupKey: string) => {
    setManualMerges((prev) => {
      const newMap = new Map(prev);
      newMap.set(sourceGroupKey, targetGroupKey);
      return newMap;
    });

    // 更新 SKU mappings：把源分组的 SKU 都映射到目标分组
    setMappings((prev) =>
      prev.map((m) => {
        // 找到源分组包含的所有原始 groupKey
        const displayGroups = getDisplayGroups();
        const sourceGroup = displayGroups.find((g) => g.groupKey === sourceGroupKey);
        if (sourceGroup?.originalGroupKeys.includes(m.groupKey)) {
          return { ...m, groupKey: targetGroupKey };
        }
        return m;
      })
    );

    message.success(`已将 "${sourceGroupKey}" 合并到 "${targetGroupKey}"`);
  };

  // 重置所有手动合并和自定义分组
  const handleResetMerges = () => {
    setManualMerges(new Map());
    setCustomGroups([]);
    setDeletedGroupKeys(new Set());
    // 重置 mappings 到原始建议
    if (preview) {
      setMappings(preview.suggestedMappings);
    }
    message.info('所有更改已重置');
  };

  // 创建新分组
  const handleCreateGroup = (values: { brand: string; model: string; title: string }) => {
    const groupKey = `custom-${Date.now()}`;
    const newGroup: CustomGroup = {
      groupKey,
      brand: values.brand,
      model: values.model,
      suggestedTitle: values.title || `${values.brand} ${values.model}`,
    };
    setCustomGroups((prev) => [...prev, newGroup]);
    setIsNewGroupModalOpen(false);
    newGroupForm.resetFields();
    message.success(`已创建新分组: ${values.brand} - ${values.model}`);
  };

  // 删除分组
  const handleDeleteGroup = (groupKey: string, isCustom?: boolean) => {
    // 找到当前显示的分组，获取其 originalGroupKeys
    const displayGroup = getDisplayGroups().find((g) => g.groupKey === groupKey);
    const keysToDelete = displayGroup?.originalGroupKeys || [groupKey];

    // 检查分组是否有 SKU 分配
    const assignedSkuCount = mappings.filter((m) => m.groupKey === groupKey).length;

    if (assignedSkuCount > 0) {
      // 需要用户确认并选择重新分配的目标分组
      const otherGroups = getDisplayGroups().filter((g) => g.groupKey !== groupKey);
      if (otherGroups.length === 0) {
        message.error('无法删除唯一的分组，至少需要保留一个分组。');
        return;
      }

      modal.confirm({
        title: '删除分组',
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>
              此分组已分配 <strong>{assignedSkuCount}</strong> 个 SKU。
            </p>
            <p className="mt-2">
              删除此分组将把所有 SKU 移动到第一个可用分组:
              <strong className="ml-1">{otherGroups[0].brand} - {otherGroups[0].model}</strong>
            </p>
          </div>
        ),
        okText: '删除并重新分配',
        okButtonProps: { danger: true },
        cancelText: '取消',
        onOk: () => {
          // 重新分配 SKU 到第一个可用分组
          const targetGroupKey = otherGroups[0].groupKey;
          setMappings((prev) =>
            prev.map((m) =>
              m.groupKey === groupKey ? { ...m, groupKey: targetGroupKey } : m
            )
          );
          // 执行删除
          executeDeleteGroup(keysToDelete, isCustom);
        },
      });
    } else {
      // 没有 SKU 分配，直接删除
      executeDeleteGroup(keysToDelete, isCustom);
    }
  };

  // 执行删除分组
  const executeDeleteGroup = (keysToDelete: string[], isCustom?: boolean) => {
    if (isCustom) {
      // 删除自定义分组
      const keySet = new Set(keysToDelete);
      setCustomGroups((prev) => prev.filter((g) => !keySet.has(g.groupKey)));
    } else {
      // 标记原始分组为已删除
      setDeletedGroupKeys((prev) => {
        const newSet = new Set(prev);
        for (const key of keysToDelete) {
          newSet.add(key);
        }
        return newSet;
      });
    }
    message.success('分组已删除');
  };

  // 恢复已删除的分组
  const handleRestoreGroup = (groupKey: string) => {
    setDeletedGroupKeys((prev) => {
      const newSet = new Set(prev);
      newSet.delete(groupKey);
      return newSet;
    });
    message.info('分组已恢复');
  };

  // 当分组模式改变时，重新映射 SKU
  const handleGroupModeChange = (mode: GroupMode) => {
    setGroupMode(mode);
    setManualMerges(new Map()); // 切换模式时清空手动合并
    setCustomGroups([]); // 清空自定义分组
    setDeletedGroupKeys(new Set()); // 清空已删除分组

    if (!preview) return;

    // 根据新模式重新生成 mappings
    if (mode === 'byBrand') {
      // 按品牌合并：把原始 groupKey 映射到品牌 key
      const brandKeyMap = new Map<string, string>();
      for (const group of preview.groups) {
        const brandKey = group.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        brandKeyMap.set(group.groupKey, brandKey);
      }

      setMappings((prev) =>
        prev.map((m) => ({
          ...m,
          groupKey: brandKeyMap.get(m.groupKey) || m.groupKey,
        }))
      );
    } else {
      // 恢复原始映射
      setMappings(preview.suggestedMappings);
    }
  };

  // 更新同图片的所有SKU的分组
  const handleImageGroupChange = (imageUrl: string, groupKey: string) => {
    // 找到所有使用该图片的SKU
    const affectedSkuIds =
      detail?.skus
        .filter((sku) => (sku.image || 'no-image') === imageUrl)
        .map((sku) => sku.id) || [];

    setMappings((prev) =>
      prev.map((m) =>
        affectedSkuIds.includes(m.skuId) ? { ...m, groupKey } : m
      )
    );
  };



  const handleExecuteSplit = async () => {
    const groupCount = getDisplayGroups().length;
    modal.confirm({
      title: '确认拆分',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>
            这将把产品拆分为{' '}
            <strong>{groupCount}</strong> 个独立产品。
          </p>
          {groupMode === 'byBrand' && (
            <p className="text-blue-500">
              模式: 按品牌（从 {preview?.groups.length} 个原始分组合并）
            </p>
          )}
          <p>
            原始产品将被标记为&quot;已拆分&quot;并隐藏。
          </p>
          <p className="mt-2 text-orange-500">
            如有需要，此操作可以稍后回滚。
          </p>
        </div>
      ),
      okText: '执行拆分',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          setSplitting(true);

          // 构建自定义分组（如果使用了合并模式、手动合并、新建分组或删除分组）
          const currentDisplayGroups = getDisplayGroups();
          const needCustomGroups =
            groupMode === 'byBrand' ||
            manualMerges.size > 0 ||
            customGroups.length > 0 ||
            deletedGroupKeys.size > 0;

          const result = await post<SplitResultType>('/products/split', {
            productId,
            skuMappings: mappings,
            // 传递自定义分组（如果有合并）
            customGroups: needCustomGroups
              ? currentDisplayGroups.map((g) => ({
                  groupKey: g.groupKey,
                  brand: g.brand,
                  model: g.model,
                  suggestedTitle: g.suggestedTitle,
                  originalGroupKeys: g.originalGroupKeys,
                }))
              : undefined,
          });
          setSplitResult(result);
          message.success(
            `成功拆分为 ${result.createdProducts.length} 个产品`
          );
        } catch (error) {
          message.error(
            error instanceof Error ? error.message : '拆分产品失败'
          );
        } finally {
          setSplitting(false);
        }
      },
    });
  };

  // Loading state
  if (status === 'hydrating' || status === 'recovering_token' || loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  // Auth check
  if (status === 'unauthenticated' || status === 'forbidden') {
    return (
      <Result
        status="403"
        title="未登录"
        subTitle="请先登录以使用拆分工具"
        extra={
          <Button type="primary" onClick={() => router.replace('/admin/login')}>
            去登录
          </Button>
        }
      />
    );
  }

  // No data
  if (!detail || !preview) {
    return (
      <Result
        status="error"
        title="加载失败"
        subTitle="无法加载产品数据进行拆分"
        extra={
          <Button onClick={() => router.back()}>
            返回
          </Button>
        }
      />
    );
  }

  // Split completed
  if (splitResult) {
    return (
      <LazySplitResultView
        splitResult={splitResult}
        onBackToMixed={() => router.push('/admin/products?tab=mixed')}
        onViewAllProducts={() => router.push('/admin/products')}
      />
    );
  }

  const { product, skus } = detail;
  const overview = preview.aiAnalysis?.overview;

  // 验证必要的数据结构
  if (!overview || !overview.mixednessScore) {
    return (
      <Result
        status="error"
        title="分析数据不完整"
        subTitle="AI 分析数据不完整或来自旧版本，请重新分析此产品。"
        extra={
          <Button onClick={() => router.back()}>返回</Button>
        }
      />
    );
  }

  // 获取按图片分组的数据
  const imageGroups = groupSkusByImage();

  // 获取显示用的分组（应用模式和手动合并）
  const displayGroups = getDisplayGroups();

  const hasChanges = manualMerges.size > 0 || customGroups.length > 0 || deletedGroupKeys.size > 0;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push('/admin/products?tab=mixed')}
      >
        返回列表
      </Button>

      <LazySourceProductCard
        product={product}
        sourceProduct={preview.sourceProduct}
      />

      <LazyAIAnalysisCard
        overview={overview}
        aiConfidence={preview.aiAnalysis.overallConfidence}
        groupCount={preview.groups.length}
      />

      <LazyGroupsPanel
        displayGroups={displayGroups}
        groupMode={groupMode}
        mappings={mappings}
        hasChanges={hasChanges}
        onGroupModeChange={handleGroupModeChange}
        onMergeGroup={handleMergeGroup}
        onDeleteGroup={handleDeleteGroup}
        onResetMerges={handleResetMerges}
        onOpenNewGroupModal={() => setIsNewGroupModalOpen(true)}
      />

      <LazySKUMappingTable
        imageGroups={imageGroups}
        skuCount={skus.length}
        displayGroups={displayGroups}
        groupMode={groupMode}
        mappings={mappings}
        onImageGroupChange={handleImageGroupChange}
      />

      <LazyDeletedGroupsBar
        deletedGroupKeys={deletedGroupKeys}
        originalGroups={preview.groups}
        onRestoreGroup={handleRestoreGroup}
      />

      <LazyActionBar
        displayGroupCount={displayGroups.length}
        originalGroupCount={preview.groups.length}
        customGroupCount={customGroups.length}
        deletedGroupCount={deletedGroupKeys.size}
        groupMode={groupMode}
        splitting={splitting}
        onCancel={() => router.push('/admin/products?tab=mixed')}
        onExecuteSplit={handleExecuteSplit}
      />

      {isNewGroupModalOpen && (
        <LazyNewGroupModal
          open={isNewGroupModalOpen}
          form={newGroupForm}
          onClose={() => setIsNewGroupModalOpen(false)}
          onFinish={handleCreateGroup}
        />
      )}
    </div>
  );
}
