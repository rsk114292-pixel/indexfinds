'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import {
  LayoutDashboard,
  Heart,
  History,
  Gift,
  Coins,
  Shield,
  LogOut,
} from 'lucide-react';
import { App } from 'antd';
import { useAuthStore } from '@/stores/useAuthStore';
import { stringToColor, getInitial } from './AvatarUpload';
import { logout as logoutApi } from '@/lib/auth-api';

const menuItems = [
  { href: '/account' as const, icon: LayoutDashboard, labelKey: 'overview' as const },
  { href: '/account/favorites' as const, icon: Heart, labelKey: 'favorites' as const },
  { href: '/account/history' as const, icon: History, labelKey: 'browsingHistory' as const },
  { href: '/account/referral' as const, icon: Gift, labelKey: 'referral' as const },
  { href: '/account/points' as const, icon: Coins, labelKey: 'points' as const },
  { href: '/account/security' as const, icon: Shield, labelKey: 'security' as const },
];

export { menuItems };

export default function AccountSidebar() {
  const t = useTranslations('account');
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { message } = App.useApp();

  const isActive = (href: string) => {
    if (href === '/account') return pathname === '/account';
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // continue logout even if API fails
    }
    logout();
    router.push('/');
    message.success(t('loggedOutSuccess'));
  };

  return (
    <aside className="w-60 shrink-0">
      <div className="sticky top-20 space-y-1">
        {/* User info card */}
        <div className="flex items-center gap-3 px-3 py-4 mb-2">
          {user?.avatar ? (
             
            <img
              src={user.avatar}
              alt={t('avatar')}
              className="w-10 h-10 rounded-full object-cover shrink-0"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
              style={{ backgroundColor: stringToColor(user?.email || '') }}
            >
              {getInitial(user?.username, user?.email || '')}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {user?.username || t('user')}
            </p>
            <p className="text-xs text-muted truncate">{user?.email}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav aria-label={t('accountNavigation')}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                  transition-colors duration-200
                  ${active
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-foreground hover:bg-gray-100'
                  }
                `}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="pt-4 mt-4 border-t border-border">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm
                       text-muted hover:text-error hover:bg-red-50
                       transition-colors duration-200 cursor-pointer"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            <span>{t('logOut')}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
