'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseScrollDirectionOptions {
  threshold?: number;
  disabled?: boolean;
}

/**
 * 滚动方向检测 hook
 *
 * - 向下滚 > threshold → headerVisible = false
 * - 向上滚 > threshold → headerVisible = true
 * - 页面顶部 (scrollY < 10) → 始终 true
 * - 使用 requestAnimationFrame 节流
 */
export function useScrollDirection({
  threshold = 10,
  disabled = false,
}: UseScrollDirectionOptions = {}): { headerVisible: boolean } {
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const update = useCallback(() => {
    const currentScrollY = window.scrollY;

    if (currentScrollY < 10) {
      setHeaderVisible(true);
    } else if (currentScrollY - lastScrollY.current > threshold) {
      setHeaderVisible(false);
      lastScrollY.current = currentScrollY;
    } else if (lastScrollY.current - currentScrollY > threshold) {
      setHeaderVisible(true);
      lastScrollY.current = currentScrollY;
    }

    ticking.current = false;
  }, [threshold]);

  useEffect(() => {
    if (disabled) return;

    lastScrollY.current = window.scrollY;

    const onScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(update);
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [disabled, update]);

  if (disabled) return { headerVisible: true };

  return { headerVisible };
}
