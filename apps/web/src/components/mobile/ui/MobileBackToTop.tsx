'use client';

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronUp } from 'lucide-react';

const SCROLL_THRESHOLD = 800;

/**
 * 移动端「回到顶部」浮动按钮
 *
 * - 滚动超过 800px 时显示
 * - 点击平滑滚动到顶部
 * - 固定在右下角 TabBar 上方
 */
export const MobileBackToTop = memo(function MobileBackToTop() {
  const tc = useTranslations('common');
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      const shouldShow = window.scrollY > SCROLL_THRESHOLD;
      if (shouldShow !== visibleRef.current) {
        visibleRef.current = shouldShow;
        setVisible(shouldShow);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <button
      type="button"
      aria-label={tc('backToTop')}
      onClick={scrollToTop}
      className={`fixed bottom-20 right-4 rtl:left-4 rtl:right-auto z-10 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center transition-all duration-300 active:scale-90 ${
        visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <ChevronUp className="w-5 h-5 text-gray-600" />
    </button>
  );
});
