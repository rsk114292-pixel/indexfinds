import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { lockBodyScroll, forceUnlockBodyScroll } from '@/lib/body-scroll-lock';

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    return lockBodyScroll();
  }, [locked]);

  // 路由切换时强制解锁，防止泄漏
  const pathname = usePathname();
  useEffect(() => {
    return () => {
      forceUnlockBodyScroll();
    };
  }, [pathname]);
}
