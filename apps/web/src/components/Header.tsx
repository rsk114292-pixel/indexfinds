'use client';

import { Link, useRouter } from '@/i18n/navigation';
import dynamic from 'next/dynamic';
import { Dropdown } from 'antd';
import { User, LogIn, LogOut, Menu } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import CurrencySelector from './CurrencySelector';
import PlatformSelector from './PlatformSelector';
import { useState, useCallback } from 'react';
import { APP_NAME } from '@/lib/constants';
import { useAuthStore } from '@/stores/useAuthStore';
import { useHeaderStore } from '@/stores/useHeaderStore';
import { logout as logoutApi } from '@/lib/auth-api';
import { useTranslations } from 'next-intl';

const SearchBox = dynamic(() => import('./SearchBox'), { ssr: false });

export default function Header() {
  const [avatarError, setAvatarError] = useState(false);
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const heroSearchVisible = useHeaderStore((s) => s.heroSearchVisible);
  const t = useTranslations('header');
  const tc = useTranslations('common');

  const handleAvatarError = useCallback(() => setAvatarError(true), []);

  const navItems = [
    { label: t('categories'), href: '/categories' as const },
    { label: t('brands'), href: '/brands' as const },
    { label: t('allProducts'), href: '/products' as const },
  ];

  const navMenu = {
    items: navItems.map((item) => ({
      key: item.href,
      label: item.label,
      onClick: () => router.push(item.href),
    })),
  };

  const userMenu = {
    items: [
      {
        key: 'profile',
        label: t('myAccount'),
        icon: <User className="w-4 h-4" />,
        onClick: () => router.push('/account'),
      },
      {
        key: 'logout',
        label: tc('logout'),
        icon: <LogOut className="w-4 h-4" />,
        onClick: async () => {
          try {
            await logoutApi();
          } catch {
            // 即使 API 失败也继续登出
          }
          logout();
          router.push('/');
        },
      },
    ],
  };

  return (
    <header className="w-full bg-secondary">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-2 lg:gap-3 xl:gap-5">
          <div className="flex min-w-0 shrink items-center gap-2 lg:gap-3 xl:gap-4">
            {/* Logo */}
            <Link href="/" className="shrink-0 text-lg font-bold text-white xl:text-xl">
              {APP_NAME}
            </Link>

            <Dropdown menu={navMenu} placement="bottomLeft" trigger={['click']}>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/78 transition-colors duration-200 hover:text-white xl:hidden"
                aria-label={t('mainNavigation')}
              >
                <Menu className="h-4.5 w-4.5" />
              </button>
            </Dropdown>

            {/* Nav links */}
            <nav className="hidden min-w-0 items-center gap-0.5 xl:flex" aria-label={t('mainNavigation')}>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-2.5 py-2 text-sm whitespace-nowrap text-white/80 transition-colors duration-200 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* SearchBox — hidden when hero search is visible on homepage */}
          <div
            className={`flex-1 flex items-center transition-all duration-300 ease-in-out ${
              heroSearchVisible
                ? 'max-w-0 opacity-0 overflow-hidden'
                : 'min-w-[260px] lg:min-w-[300px] xl:min-w-[360px] max-w-[30rem] xl:max-w-[38rem] 2xl:max-w-[50rem] lg:flex-[1_1_20rem] xl:flex-[1_1_28rem] opacity-100'
            }`}
          >
            <SearchBox />
          </div>

          {/* Right actions */}
          <div className="flex shrink-0 items-center gap-0.5 xl:gap-1">
            {/* Language & Currency */}
            <PlatformSelector />
            <LanguageSwitcher />
            <CurrencySelector />

            {/* User */}
            {isAuthenticated ? (
              <Dropdown menu={userMenu} placement="bottomRight">
                <button
                  type="button"
                  className="flex h-10 items-center gap-2 rounded-lg px-2 text-white/80 transition-colors duration-200 cursor-pointer hover:text-white xl:px-2.5 2xl:px-3"
                >
                  {user?.avatar && !avatarError ? (
                     
                    <img
                      src={user.avatar}
                      alt="Avatar"
                      className="w-7 h-7 rounded-full object-cover"
                      onError={handleAvatarError}
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                  <span className="hidden max-w-[96px] truncate text-sm 2xl:block">
                    {user?.username || user?.email}
                  </span>
                </button>
              </Dropdown>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-3 h-10 text-sm text-white/80 hover:text-white transition-colors duration-200 rounded-md"
                >
                  <LogIn className="w-4 h-4" />
                  {tc('login')}
                </Link>
                <Link
                  href="/register"
                  className="flex items-center h-10 px-4 text-sm font-medium bg-primary text-white hover:bg-primary-hover rounded-lg transition-colors duration-200"
                >
                  {tc('signUp')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
