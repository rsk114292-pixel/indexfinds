'use client';

import { useRef, type ReactNode } from 'react';
import { useInfiniteScroll } from 'ahooks';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

/** ahooks useInfiniteScroll 要求的数据结构 */
export interface InfiniteScrollData<T> {
  list: T[];
  /** 当前页数据是否还有下一页（或后端返回的 nextCursor 等） */
  hasMore?: boolean;
}

interface MobileInfiniteScrollProps<T> {
  /** 数据加载函数，返回 { list, hasMore } */
  loadData: (data?: InfiniteScrollData<T>) => Promise<InfiniteScrollData<T>>;
  /** 渲染每一项的函数 */
  renderItem: (item: T, index: number) => ReactNode;
  /** 列表为空时的展示 */
  emptyNode?: ReactNode;
  /** 触底距离（px），默认 200 */
  threshold?: number;
  /** 列表容器 className（用于控制网格布局等） */
  listClassName?: string;
  /** 判断是否没有更多数据 */
  isNoMore?: (data?: InfiniteScrollData<T>) => boolean;
  /** 依赖变化时自动 reload */
  reloadDeps?: unknown[];
}

/**
 * 移动端无限滚动组件
 *
 * 基于 ahooks useInfiniteScroll，自动检测滚动位置并加载更多。
 * 提供「加载中」「没有更多」「加载失败」三种底部状态。
 *
 * 用法示例：
 * ```tsx
 * <MobileInfiniteScroll
 *   loadData={async (prev) => {
 *     const page = prev ? Math.ceil(prev.list.length / 20) + 1 : 1;
 *     const res = await fetchProducts({ page, limit: 20 });
 *     return { list: [...(prev?.list ?? []), ...res.items], hasMore: res.hasMore };
 *   }}
 *   renderItem={(product, i) => <MobileProductCard key={product.id} product={product} position={i} />}
 *   listClassName="grid grid-cols-2 gap-3 px-4"
 *   isNoMore={(d) => !d?.hasMore}
 * />
 * ```
 */
export function MobileInfiniteScroll<T>({
  loadData,
  renderItem,
  emptyNode,
  threshold = 200,
  listClassName,
  isNoMore,
  reloadDeps,
}: MobileInfiniteScrollProps<T>) {
  const t = useTranslations('common');
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, loading, loadingMore, noMore, error, reload } =
    useInfiniteScroll(loadData, {
      target: typeof window !== 'undefined' ? document : undefined,
      threshold,
      isNoMore: isNoMore ?? ((d) => d?.hasMore === false),
      reloadDeps,
    });

  const list = data?.list ?? [];
  const isEmpty = !loading && list.length === 0;

  return (
    <div ref={containerRef}>
      {/* 列表区域 */}
      {list.length > 0 && (
        <div className={listClassName}>
          {list.map((item, index) => renderItem(item, index))}
        </div>
      )}

      {/* 空状态 */}
      {isEmpty && !error && (
        emptyNode ?? (
          <div className="flex flex-col items-center justify-center py-20 text-muted">
            <p className="text-sm">{t('noData')}</p>
          </div>
        )
      )}

      {/* 底部状态 */}
      <div className="flex items-center justify-center py-6">
        {/* 加载中 */}
        {(loading || loadingMore) && (
          <div className="flex items-center gap-2 text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{t('loading')}</span>
          </div>
        )}

        {/* 没有更多 */}
        {noMore && list.length > 0 && (
          <p className="text-xs text-muted">
            {t('noMore')}
          </p>
        )}

        {/* 加载失败 — 点击重试 */}
        {error && !loading && (
          <button
            type="button"
            onClick={reload}
            className="text-sm text-primary active:opacity-70"
          >
            {t('loadFailed')}
          </button>
        )}
      </div>
    </div>
  );
}
