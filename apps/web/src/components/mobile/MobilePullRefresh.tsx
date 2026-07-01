'use client';

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface MobilePullRefreshProps {
  /** 触发刷新的回调，返回 Promise 控制刷新完成 */
  onRefresh: () => Promise<void>;
  /** 子内容 */
  children: ReactNode;
  /** 下拉触发距离（默认 60px） */
  threshold?: number;
  /** 最大下拉距离（默认 120px） */
  maxPull?: number;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 移动端下拉刷新组件
 *
 * 设计规格（Plan 4.3）：
 * - 顶部加载指示器
 * - overscroll-behavior: contain 防止系统滚动
 * - 触发阈值 60px，最大下拉 120px
 * - 橡皮筋阻尼效果（越远越慢）
 * - 旋转箭头 → 加载 Spinner 动画
 *
 * 原理：
 * - 仅在滚动容器 scrollTop === 0 时激活下拉手势
 * - 使用原生 touchstart/touchmove/touchend 事件（non-passive）
 * - 阻尼公式：实际位移 = 手指位移 × (1 - 已拉距离 / maxPull × 0.6)
 */
export default function MobilePullRefresh({
  onRefresh,
  children,
  threshold = 60,
  maxPull = 120,
  disabled = false,
}: MobilePullRefreshProps) {
  const tc = useTranslations('common');
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 使用 ref 保持回调最新引用，避免频繁 re-bindlistener
  const stateRef = useRef({ disabled, refreshing, maxPull, threshold, onRefresh, pullDistance });
  stateRef.current = { disabled, refreshing, maxPull, threshold, onRefresh, pullDistance };

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    const { pullDistance: pd, threshold: th, refreshing: ref, onRefresh: onRef } = stateRef.current;

    if (pd >= th && !ref) {
      setRefreshing(true);
      setPullDistance(th);

      try {
        await onRef();
      } catch {
        // ignore
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e: TouchEvent) => {
      const { disabled: d, refreshing: r } = stateRef.current;
      if (d || r) return;

      // 查找最近的可滚动父元素，仅在顶部时启用
      let el: HTMLElement | null = e.target as HTMLElement;
      while (el && el !== container) {
        if (el.scrollTop > 0) return;
        el = el.parentElement;
      }

      if (window.scrollY > 0) return;

      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      const { disabled: d, refreshing: r, maxPull: mp } = stateRef.current;
      if (!isPulling.current || d || r) return;

      const deltaY = e.touches[0].clientY - touchStartY.current;
      if (deltaY <= 0) {
        setPullDistance(0);
        return;
      }

      // 正在下拉手势中，阻止原生滚动/浏览器下拉刷新
      if (e.cancelable) e.preventDefault();

      // 阻尼效果：越拉越慢
      const dampedDistance = deltaY * (1 - (Math.min(deltaY, mp) / mp) * 0.6);
      const clampedDistance = Math.min(dampedDistance, mp);
      setPullDistance(clampedDistance);
    };

    const onTouchEnd = () => {
      handleTouchEnd();
    };

    // touchstart 可以是 passive（不需要 preventDefault）
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    // touchmove 必须是 non-passive 才能 preventDefault
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, [handleTouchEnd]);

  const progress = Math.min(pullDistance / threshold, 1);
  const showIndicator = pullDistance > 10 || refreshing;

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ overscrollBehavior: 'contain' }}
    >
      {/* 下拉指示器 */}
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] ease-out"
        style={{
          height: showIndicator ? `${pullDistance}px` : 0,
          transitionDuration: isPulling.current ? '0ms' : '300ms',
        }}
      >
        <div
          className="flex items-center gap-2"
          style={{
            opacity: progress,
            transform: `scale(${0.5 + progress * 0.5})`,
          }}
        >
          {refreshing ? (
            <RefreshCw className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <RefreshCw
              className="w-5 h-5 text-muted transition-transform"
              style={{
                transform: `rotate(${progress * 180}deg)`,
              }}
            />
          )}
          <span className="text-xs text-muted">
            {refreshing
              ? tc('refreshing')
              : progress >= 1
                ? tc('releaseToRefresh')
                : tc('pullToRefresh')}
          </span>
        </div>
      </div>

      {/* 主内容 */}
      {children}
    </div>
  );
}
