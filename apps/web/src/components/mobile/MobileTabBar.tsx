'use client';

import { useState, useCallback, useEffect } from 'react';
import { Home, LayoutGrid, Sparkles, Heart, User } from 'lucide-react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTranslations } from 'next-intl';
import { MobileSheet } from '@/components/mobile/ui/MobileSheet';
import { PUBLIC_AUTH_ENTRY_ENABLED } from '@/lib/features';

interface TabItem {
  key: 'home' | 'categories' | 'allProducts' | 'favorites' | 'account';
  icon: React.ElementType;
  href: string;
  /** 需要登录才能访问 */
  requiresAuth?: boolean;
}

const TABS: TabItem[] = [
  { key: 'home', icon: Home, href: '/' },
  { key: 'categories', icon: LayoutGrid, href: '/categories' },
  { key: 'allProducts', icon: Sparkles, href: '/products' },
  { key: 'favorites', icon: Heart, href: '/account/favorites', requiresAuth: true },
  { key: 'account', icon: User, href: '/account' },
];

/**
 * 移动端底部 Tab 导航（Section 3.7）
 *
 * 规格：h-14 (56px) + safe-area / 白底 / z-20
 * 5 列均分 / 激活色 primary / 未激活色 tab-inactive
 * 收藏和我的 Tab 有认证守卫（弹出 MobileSheet 登录引导）
 */
export default function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const t = useTranslations('tabBar');
  const [showLoginSheet, setShowLoginSheet] = useState(false);
  const [loginRedirect, setLoginRedirect] = useState('');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const showAccountTabs =
    PUBLIC_AUTH_ENTRY_ENABLED || (_hasHydrated && isAuthenticated);
  const visibleTabs = showAccountTabs
    ? TABS
    : TABS.filter(
        (tab) => tab.key !== 'favorites' && tab.key !== 'account',
      );

  const isActive = useCallback(
    (tab: TabItem) => {
      if (tab.key === 'home') return pathname === '/' || pathname === '';
      if (tab.key === 'allProducts') return pathname.startsWith('/products');
      return pathname.startsWith(tab.href);
    },
    [pathname],
  );

  const handleTabClick = useCallback(
    (tab: TabItem, e: React.MouseEvent) => {
      if (tab.requiresAuth && _hasHydrated && !isAuthenticated) {
        e.preventDefault();
        setLoginRedirect(tab.href);
        setShowLoginSheet(true);
      }
    },
    [isAuthenticated, _hasHydrated],
  );

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-20 bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_rgba(0,0,0,0.06)]"
      >
        <div
          className={`grid h-14 ${
            visibleTabs.length === 5 ? 'grid-cols-5' : 'grid-cols-3'
          }`}
        >
          {visibleTabs.map((tab) => {
            const active = isActive(tab);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.key}
                href={tab.href}
                onClick={(e) => handleTabClick(tab, e)}
                aria-current={mounted && active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 transition-colors duration-150 active:scale-95 ${
                  active ? 'text-primary' : 'text-tab-inactive'
                }`}
              >
                <Icon className="h-6 w-6" strokeWidth={active ? 2.2 : 1.8} />
                <span className="text-[10px] font-medium">{t(tab.key)}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 认证守卫：登录引导面板 */}
      {PUBLIC_AUTH_ENTRY_ENABLED && (
        <MobileSheet
          open={showLoginSheet}
          onClose={() => setShowLoginSheet(false)}
          title={t('loginRequired')}
        >
          <div className="flex flex-col items-center gap-4 py-6">
            <p className="text-center text-muted">
              {t('loginRequiredDesc')}
            </p>
            <button
              type="button"
              onClick={() => {
                setShowLoginSheet(false);
                router.push(`/login?redirect=${encodeURIComponent(loginRedirect)}`);
              }}
              className="w-full rounded-xl bg-primary py-3 text-center font-semibold text-white active:bg-primary-hover transition-colors"
            >
              {t('goLogin')}
            </button>
            <button
              type="button"
              onClick={() => setShowLoginSheet(false)}
              className="text-sm text-muted"
            >
              {t('skipLogin')}
            </button>
          </div>
        </MobileSheet>
      )}
    </>
  );
}
