'use client';

import { usePathname } from 'next/navigation';
import { isImmersivePath, isHeaderHiddenPath, isSearchPath, isSubPagePath } from '@/lib/utils';

/**
 * 沉浸式页面守卫：在商品详情页等沉浸式页面隐藏子组件
 * 用于在服务端 layout 中条件性隐藏 MobileHeader / MobileTabBar
 */
export function MobileImmersiveGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isImmersivePath(pathname)) return null;
  return <>{children}</>;
}

/**
 * Header 守卫：在沉浸式页面和 Header 隐藏页面（如个人中心）都隐藏 Header
 */
export function MobileHeaderGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isImmersivePath(pathname) || isHeaderHiddenPath(pathname)) return null;
  return <>{children}</>;
}

/**
 * 沉浸式感知的 main 容器：在沉浸式页面移除移动端的 padding
 * Header 隐藏页面也需要调整 padding（无 Header，有 TabBar）
 */
export function ImmersiveMain({ children, id }: { children: React.ReactNode; id?: string }) {
  const pathname = usePathname();
  const isImmersive = isImmersivePath(pathname);
  const isSubPage = isSearchPath(pathname) || isSubPagePath(pathname);
  const isHeaderHidden = isHeaderHiddenPath(pathname);

  let mobilePadding = 'pt-[6.5rem] pb-14';
  if (isImmersive) mobilePadding = '';
  else if (isSubPage) mobilePadding = 'pt-12 pb-14';
  else if (isHeaderHidden) mobilePadding = 'pb-14';

  return (
    <main id={id} className={`flex-1 bg-background lg:pt-0 lg:pb-0 ${mobilePadding}`}>
      {children}
    </main>
  );
}
