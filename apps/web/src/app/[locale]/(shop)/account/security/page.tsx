'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import SecuritySessions from '@/components/account/SecuritySessions';
import SecurityLinkedAccounts from '@/components/account/SecurityLinkedAccounts';
import SecurityPassword from '@/components/account/SecurityPassword';
import MobileSubPageHeader from '@/components/mobile/MobileSubPageHeader';
import MobileSettings from '../components/mobile/MobileSettings';
import { buildAuthRedirectPath, buildLoginHref } from '@/lib/auth-redirect';

export default function AccountSecurityPage() {
  const t = useTranslations('account');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const loginHref = buildLoginHref(buildAuthRedirectPath(pathname, searchParams));

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.replace(loginHref);
    }
  }, [_hasHydrated, isAuthenticated, loginHref, router]);

  return (
    <>
      {/* ── PC 端视图 ── */}
      <div className="hidden lg:block space-y-6">
        <h2 className="text-lg font-bold text-foreground">{t('securitySettings')}</h2>
        <SecuritySessions />
        <SecurityLinkedAccounts />
        <SecurityPassword />
      </div>

      {/* ── 移动端视图 ── */}
      <div className="lg:hidden">
        <MobileSubPageHeader title={t('securitySettings')} />
        <MobileSettings />
      </div>
    </>
  );
}
