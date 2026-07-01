'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';

/**
 * 骨架屏基础块
 *
 * 规格（Section 3.7 MobileSkeleton）：
 * - 基底色 --color-skeleton (#E5E7EB) → bg-gray-200
 * - 高光色 --color-skeleton-shine (#F3F4F6) → animate-pulse
 * - 动画 1.5s / ease-in-out / infinite → Tailwind animate-pulse
 * - 圆角与对应内容一致
 */
function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-gray-200', className)}
    />
  );
}

/** 商品卡片骨架屏 — 对应 MobileProductCard 布局 */
export const MobileProductCardSkeleton = memo(function MobileProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl bg-surface shadow-sm overflow-hidden', className)}>
      {/* 图片占位 1:1 */}
      <SkeletonBlock className="aspect-square rounded-none rounded-t-xl" />
      {/* 信息区域 */}
      <div className="p-3 space-y-2">
        {/* 品牌标签 */}
        <SkeletonBlock className="h-5 w-16 rounded-full" />
        {/* 标题行 1 */}
        <SkeletonBlock className="h-4 w-full" />
        {/* 标题行 2 */}
        <SkeletonBlock className="h-4 w-3/4" />
        {/* 价格 */}
        <SkeletonBlock className="h-5 w-20" />
      </div>
    </div>
  );
});

/** 商品卡片网格骨架屏 — 双列布局，默认 6 个 */
export function MobileProductGridSkeleton({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 px-4', className)}>
      {Array.from({ length: count }, (_, i) => (
        <MobileProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** 列表项骨架屏 — 左图右文，用于水平列表场景 */
export function MobileListItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex gap-3 p-3', className)}>
      {/* 缩略图 */}
      <SkeletonBlock className="h-20 w-20 shrink-0 rounded-lg" />
      {/* 文字区域 */}
      <div className="flex-1 space-y-2 py-1">
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-2/3" />
        <SkeletonBlock className="h-4 w-1/3" />
      </div>
    </div>
  );
}

/** 详情页骨架屏 — 大图 + 信息块 */
export function MobileDetailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* 主图 */}
      <SkeletonBlock className="aspect-square w-full rounded-none" />
      {/* 信息区 */}
      <div className="px-4 space-y-3">
        {/* 价格 */}
        <SkeletonBlock className="h-7 w-28" />
        {/* 标题 */}
        <SkeletonBlock className="h-5 w-full" />
        <SkeletonBlock className="h-5 w-4/5" />
        {/* 品牌 */}
        <SkeletonBlock className="h-6 w-24 rounded-full" />
        {/* 分割线 */}
        <div className="border-t border-border" />
        {/* 描述 */}
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-3/4" />
      </div>
    </div>
  );
}

/** 横滑区域骨架屏 — 标题 + 横向卡片列 */
export function MobileScrollSectionSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* 区块标题 */}
      <div className="px-4">
        <SkeletonBlock className="h-5 w-24" />
      </div>
      {/* 横向滚动卡片 */}
      <div className="flex gap-3 overflow-hidden px-4">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="shrink-0 w-28 space-y-2">
            <SkeletonBlock className="aspect-square rounded-xl" />
            <SkeletonBlock className="h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** 用户中心骨架屏 — 头像 + 统计 + 浏览历史 + 菜单 */
export function MobileAccountSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('min-h-dvh bg-gray-50', className)}>
      {/* 用户信息卡片 */}
      <div className="bg-surface px-4 pt-4 pb-5">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="w-16 h-16 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-5 w-28" />
            <SkeletonBlock className="h-4 w-40" />
          </div>
        </div>
      </div>

      {/* 数据统计 */}
      <div className="grid grid-cols-3 bg-surface mt-px">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex flex-col items-center py-4 gap-1.5">
            <SkeletonBlock className="h-6 w-8" />
            <SkeletonBlock className="h-3 w-10" />
          </div>
        ))}
      </div>

      {/* 最近浏览 */}
      <div className="bg-surface mt-2">
        <div className="flex items-center justify-between px-4 py-3">
          <SkeletonBlock className="h-4 w-20" />
          <SkeletonBlock className="h-3 w-12" />
        </div>
        <div className="flex gap-3 px-4 pb-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="shrink-0 w-20 space-y-1.5">
              <SkeletonBlock className="aspect-square rounded-lg" />
              <SkeletonBlock className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* 菜单项 */}
      <div className="bg-surface mt-2">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-b-0">
            <SkeletonBlock className="w-5 h-5 rounded" />
            <SkeletonBlock className="h-4 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** 首页骨架屏 — 搜索 + 分类横滑 + 品牌横滑 + 商品网格 */
export function MobileHomeSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('pb-4', className)}>
      {/* 搜索框 */}
      <div className="px-4 pt-3 pb-1">
        <SkeletonBlock className="h-10 w-full rounded-full" />
      </div>

      {/* 分类横滑区域 */}
      <div className="mt-4 space-y-3">
        <div className="px-4">
          <SkeletonBlock className="h-5 w-20" />
        </div>
        <div className="flex gap-4 overflow-hidden px-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="shrink-0 flex flex-col items-center gap-2">
              <SkeletonBlock className="w-14 h-14 rounded-full" />
              <SkeletonBlock className="h-3 w-10" />
            </div>
          ))}
        </div>
      </div>

      {/* 品牌横滑区域 */}
      <div className="mt-5 space-y-3">
        <div className="px-4">
          <SkeletonBlock className="h-5 w-20" />
        </div>
        <div className="flex gap-3 overflow-hidden px-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="shrink-0 w-28 space-y-2">
              <SkeletonBlock className="h-16 rounded-xl" />
              <SkeletonBlock className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* 分割线 */}
      <div className="h-2 bg-gray-50 mt-4" />

      {/* 商品推荐 */}
      <div className="mt-4">
        <div className="px-4 mb-3">
          <SkeletonBlock className="h-5 w-20" />
        </div>
        <MobileProductGridSkeleton count={4} />
      </div>
    </div>
  );
}

export { SkeletonBlock };
