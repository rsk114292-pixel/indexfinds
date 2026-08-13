'use client';

import { Link, useRouter } from '@/i18n/navigation';
import dynamic from 'next/dynamic';
import { User, LogIn, LogOut, Menu } from 'lucide-react';
import PlatformSelector from './PlatformSelector';
import HeaderSettingsMenu from './HeaderSettingsMenu';
import BrandWordmark from './BrandWordmark';
import { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useHeaderStore } from '@/stores/useHeaderStore';
import { logout as logoutApi } from '@/lib/auth-api';
import { PUBLIC_AUTH_ENTRY_ENABLED } from '@/lib/features';
import { useTranslations } from 'next-intl';
import Popover from '@/components/ui/Popover';

const SearchBox = dynamic(() => import('./SearchBox'), { ssr: false });

export default function Header() {
  const [avatarError, setAvatarError] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
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
    { label: t('agents'), href: '/agents' as const },
  ];

  return (
    <header className="w-full bg-secondary">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-2 lg:gap-3 xl:gap-5">
          <div className="flex min-w-0 shrink items-center gap-2 lg:gap-3 xl:gap-4">
            {/* Logo */}
            <Link href="/" className="shrink-0" aria-label="IndexFinds">
              <BrandWordmark tone="light" />
            </Link>

            <Popover
              open={navOpen}
              onOpenChange={setNavOpen}
              align="start"
              panelRole="menu"
              panelClassName="w-52 p-2 xl:hidden"
              trigger={({ controls, expanded, toggle }) => (
                <button
                  type="button"
                  onClick={toggle}
                  aria-controls={controls}
                  aria-expanded={expanded}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/78 transition-colors duration-200 hover:text-white xl:hidden"
                  aria-label={t('mainNavigation')}
                >
                  <Menu className="h-4.5 w-4.5" />
                </button>
              )}
            >
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setNavOpen(false)}
                  className="block rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-gray-50"
                >
                  {item.label}
                </Link>
              ))}
            </Popover>

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
            <HeaderSettingsMenu />

            {/* User */}
            {isAuthenticated ? (
              <Popover
                open={userOpen}
                onOpenChange={setUserOpen}
                panelRole="menu"
                panelClassName="w-52 p-2"
                trigger={({ controls, expanded, toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-controls={controls}
                    aria-expanded={expanded}
                    className="flex h-10 items-center gap-2 rounded-lg px-2 text-white/80 transition-colors duration-200 hover:text-white xl:px-2.5 2xl:px-3"
                  >
                    {user?.avatar && !avatarError ? (
                      <img
                        src={user.avatar}
                        alt="Avatar"
                        className="h-7 w-7 rounded-full object-cover"
                        onError={handleAvatarError}
                      />
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                        <User className="h-4 w-4" />
                      </span>
                    )}
                    <span className="hidden max-w-[96px] truncate text-sm 2xl:block">
                      {user?.username || user?.email}
                    </span>
                  </button>
                )}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setUserOpen(false);
                    router.push('/account');
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-gray-50"
                >
                  <User className="h-4 w-4" />
                  {t('myAccount')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={async () => {
                    setUserOpen(false);
                    try {
                      await logoutApi();
                    } catch {
                      // Clear the local session even if the API is unavailable.
                    }
                    logout();
                    router.push('/');
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  {tc('logout')}
                </button>
              </Popover>
            ) : PUBLIC_AUTH_ENTRY_ENABLED ? (
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
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
