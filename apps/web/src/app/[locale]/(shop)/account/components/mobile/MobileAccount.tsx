'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { App } from 'antd';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getImageReferrerPolicy, getImageVariant } from '@/lib/image-utils';
import {
  History,
  Shield,
  Gift,
  ChevronRight,
  Pencil,
  Check,
  X,
  Globe,
  DollarSign,
  User,
  Coins,
  CalendarCheck,
  ArrowDownToLine,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useLocale } from 'next-intl';
import AvatarUpload from '@/components/account/AvatarUpload';
import {
  type ReferralActivationProgressData,
} from '@/components/account/ReferralActivationGuide';
import { MobileReferralActivationCard } from '@/components/account/MobileReferralActivationCard';
import { MobileWelcomeOnboardingCard } from '@/components/account/MobileWelcomeOnboardingCard';
import type { WelcomeOnboardingData } from '@/components/account/WelcomeOnboardingCard';
import { MobileAccountSkeleton } from '@/components/mobile/ui/MobileSkeleton';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import type { Locale } from '@/i18n/config';
import {
  getProfile,
  updateUsername,
  logout as logoutApi,
  sendVerificationEmail,
} from '@/lib/auth-api';
import { getBrowsingHistory } from '@/lib/browsing-history';
import { fetcher, get, post } from '@/lib/api';
import { buildReturnTo, withReturnTo } from '@/lib/return-to';
import { saveReturnScroll } from '@/lib/return-scroll';
import type { Product } from '@/types';
import { LanguageSheet, CurrencySheet, LANGUAGE_LABELS } from './MobileSettingsSheets';
import { useReferralRewardsExperiment } from '@/lib/referral-experiment';
import { ReferralRewardsHub } from '@/components/referral/ReferralRewardsHub';
import { useReferralActivationVisibility } from '@/hooks/useReferralActivationVisibility';
import { PUBLIC_AUTH_ENTRY_ENABLED } from '@/lib/features';


/**
 * 移动端用户中心页
 *
 * 规格（Plan 6.8）：
 * - 用户信息卡片（头像 + 用户名 + 邮箱）
 * - 数据统计（收藏 / 浏览 / 推荐点击）
 * - 最近浏览横向滚动
 * - Cell 列表式功能导航
 * - 退出登录按钮
 */
export default function MobileAccount() {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const tCurrency = useTranslations('currency');
  const { user, token, updateUser, logout, isAuthenticated, _hasHydrated } = useAuthStore();
  const experiment = useReferralRewardsExperiment();
  const { currency } = useCurrencyStore();
  const locale = useLocale() as Locale;
  const { message } = App.useApp();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = useMemo(() => buildReturnTo(pathname, searchParams), [pathname, searchParams]);

  const [editingName, setEditingName] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [langSheetOpen, setLangSheetOpen] = useState(false);
  const [currencySheetOpen, setCurrencySheetOpen] = useState(false);

  // Stats
  const [favCount, setFavCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [referralClicks, setReferralClicks] = useState(0);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralRegistrations, setReferralRegistrations] = useState(0);
  const [referralEarnings, setReferralEarnings] = useState(0);
  const [referralConversions, setReferralConversions] = useState(0);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activationProgress, setActivationProgress] = useState<ReferralActivationProgressData | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Points & Checkin
  const [pointsBalance, setPointsBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [streakDays, setStreakDays] = useState(0);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    if (!token) return;

    getProfile().then((data) => updateUser(data)).catch(() => {});

    const loadStats = async () => {
      try {
        const [favRes, referralRes, referralDetailsRes, pointsRes, checkinRes, activationRes] = await Promise.allSettled([
          get<unknown[]>('/favorites').catch(() => []),
          get<{ code: string; totalClicks: number; totalConversions: number }>('/referral/my-code').catch(() => null),
          get<{
            stats: {
              totalRegistrations: number;
              totalEarnings: number;
            };
          }>('/referral/details?page=1&limit=1').catch(() => null),
          get<{ balance: number; totalEarned: number; totalWithdrawn: number }>('/points/balance').catch(() => null),
          get<{ checkedInToday: boolean; streakCount: number }>('/checkin/status').catch(() => null),
          get<ReferralActivationProgressData>('/referral/my-activation').catch(() => null),
        ]);

        if (favRes.status === 'fulfilled') {
          setFavCount(Array.isArray(favRes.value) ? favRes.value.length : 0);
        }
        if (referralRes.status === 'fulfilled' && referralRes.value) {
          setReferralClicks(referralRes.value.totalClicks ?? 0);
          setReferralCode(referralRes.value.code ?? null);
          setReferralConversions(referralRes.value.totalConversions ?? 0);
        }
        if (referralDetailsRes.status === 'fulfilled' && referralDetailsRes.value) {
          setReferralRegistrations(referralDetailsRes.value.stats.totalRegistrations ?? 0);
          setReferralEarnings(referralDetailsRes.value.stats.totalEarnings ?? 0);
        }
        if (pointsRes.status === 'fulfilled' && pointsRes.value) {
          setPointsBalance(pointsRes.value.balance);
          setTotalEarned(pointsRes.value.totalEarned);
          setTotalWithdrawn(pointsRes.value.totalWithdrawn);
        }
        if (checkinRes.status === 'fulfilled' && checkinRes.value) {
          setCheckedInToday(checkinRes.value.checkedInToday);
          setStreakDays(checkinRes.value.streakCount);
        }
        if (activationRes.status === 'fulfilled' && activationRes.value) {
          setActivationProgress(activationRes.value);
        }

        const items = getBrowsingHistory();
        setHistoryCount(items.length);

        // Load recent products (up to 6)
        const recentIds = items.slice(0, 6).map((i) => i.productId);
        if (recentIds.length > 0) {
          try {
            const productsData = await fetcher<{ data: Product[] }>(
              `/products?ids=${recentIds.join(',')}&limit=6`,
            );
            if (productsData?.data) {
              const sorted = recentIds
                .map((id) => productsData.data.find((p) => p.id === id))
                .filter(Boolean) as Product[];
              setRecentProducts(sorted);
            }
          } catch {}
        }
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [token, updateUser]);

  /* ─── 签到 ─── */
  const handleCheckin = async () => {
    setCheckingIn(true);
    try {
      await post('/checkin');
      message.success(t('checkinSuccess'));
      setCheckedInToday(true);
      setStreakDays((s) => s + 1);
      setPointsBalance((b) => b + 1);
    } catch {
      message.warning(t('alreadyCheckedIn'));
    } finally {
      setCheckingIn(false);
    }
  };

  const handleResendVerification = async () => {
    setSendingEmail(true);
    try {
      await sendVerificationEmail();
      message.success(t('verificationEmailSent'));
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : t('failedToSendVerification'));
    } finally {
      setSendingEmail(false);
    }
  };

  /* ─── 编辑昵称 ─── */
  const handleStartEditName = () => {
    setNewUsername(user?.username || '');
    setEditingName(true);
  };

  const handleSaveName = async () => {
    const trimmed = newUsername.trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 30) {
      message.error(t('usernameLength'));
      return;
    }
    setSavingName(true);
    try {
      const result = await updateUsername(trimmed);
      updateUser({ username: result.username });
      message.success(t('usernameUpdated'));
      setEditingName(false);
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : t('failedToUpdateUsername'));
    } finally {
      setSavingName(false);
    }
  };

  /* ─── 退出登录 ─── */
  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {}
    logout();
    router.push('/');
    message.success(t('loggedOutSuccess'));
  };

  const isLoggedIn = _hasHydrated && isAuthenticated && !!user;
  const onboardingMode = searchParams.get('onboarding') === 'welcome';
  const activationGuideUi = useReferralActivationVisibility({
    data: activationProgress,
    surface: 'account',
    userId: user?.id,
  });
  const showActivationGuide = !!activationProgress?.isReferred
    && ['in_progress', 'rejected'].includes(activationProgress.status)
    && !activationGuideUi.dismissed;
  const welcomeGuideData = useMemo<WelcomeOnboardingData | null>(() => {
    if (!user) return null;
    return {
      emailVerified: !!user.emailVerified,
      productViews: historyCount,
      hasSavedFavorite: favCount > 0,
      isReferred: !!activationProgress?.isReferred,
    };
  }, [activationProgress?.isReferred, favCount, historyCount, user]);
  const showWelcomeGuide = onboardingMode && !loading && !!welcomeGuideData;

  const clearWelcomeMode = () => {
    if (!onboardingMode) return;
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('onboarding');
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  // Guest view: login prompt + language/currency switchers
  if (!isLoggedIn) {
    return (
      <div className="min-h-dvh bg-gray-50">
        {/* ── 登录提示卡片 ── */}
        {PUBLIC_AUTH_ENTRY_ENABLED && (
          <div className="bg-surface px-4 pt-6 pb-6">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <h1 className="text-lg font-bold text-foreground">{t('loginPromptTitle')}</h1>
              <p className="text-sm text-muted text-center">{t('loginPromptDesc')}</p>
              <div className="flex gap-3 w-full mt-1">
                <Link
                  href="/login"
                  className="flex-1 rounded-xl bg-primary py-3 text-center text-sm font-semibold text-white active:bg-primary-hover transition-colors"
                >
                  {t('loginButton')}
                </Link>
                <Link
                  href="/register"
                  className="flex-1 rounded-xl border border-border py-3 text-center text-sm font-semibold text-foreground active:bg-gray-50 transition-colors"
                >
                  {t('registerButton')}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── 语言 & 货币（无需登录） ── */}
        <div className="bg-surface mt-2">
          <button
            type="button"
            onClick={() => setLangSheetOpen(true)}
            className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors border-b border-border"
          >
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-indigo-500" />
              <span className="text-sm text-foreground">{t('language')}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted">{LANGUAGE_LABELS[locale]}</span>
              <ChevronRight className="w-4 h-4 text-muted" />
            </div>
          </button>
          <button
            type="button"
            onClick={() => setCurrencySheetOpen(true)}
            className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-green-500" />
              <span className="text-sm text-foreground">{tCurrency('label')}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted">{tCurrency(currency)}</span>
              <ChevronRight className="w-4 h-4 text-muted" />
            </div>
          </button>
        </div>

        {/* 底部空白（为 TabBar 留空） */}
        <div className="h-8" />

        <LanguageSheet open={langSheetOpen} onClose={() => setLangSheetOpen(false)} />
        <CurrencySheet open={currencySheetOpen} onClose={() => setCurrencySheetOpen(false)} />
      </div>
    );
  }

  if (loading) return <MobileAccountSkeleton />;

  const statsItems = [
    { label: t('favorites'), value: favCount, href: '/account/favorites' as const, color: 'text-red-500', bg: 'bg-red-50' },
    { label: t('statsViewed'), value: historyCount, href: '/account/history' as const, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: t('statsRefClicks'), value: referralClicks, href: '/account/referral' as const, color: 'text-orange-500', bg: 'bg-orange-50' },
  ];

  const linkMenuItems: Array<{
    icon: React.ElementType;
    label: string;
    href: string;
    color: string;
  }> = [
    { icon: Coins, label: t('pointsHistory'), href: '/account/points', color: 'text-yellow-500' },
    { icon: Gift, label: t('referralProgram'), href: '/account/referral', color: 'text-orange-500' },
    { icon: Shield, label: t('securitySettings'), href: '/account/security', color: 'text-blue-500' },
  ];

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* ── 用户信息卡片 ── */}
      <div className="bg-surface px-4 pt-4 pb-5">
        <div className="flex items-center gap-3">
          <AvatarUpload size="lg" />
          <div className="min-w-0 flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                  maxLength={30}
                  autoFocus
                  className="text-base font-bold text-foreground bg-transparent border-b-2 border-primary outline-none py-0.5 w-36"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-green-600 active:bg-green-50"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingName(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-muted active:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-bold text-foreground truncate">
                  {user.username || t('user')}
                </h1>
                <button
                  type="button"
                  onClick={handleStartEditName}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-muted active:bg-gray-100 shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <p className="text-sm text-muted truncate mt-0.5">{user.email}</p>
          </div>
        </div>
      </div>

      {showWelcomeGuide && welcomeGuideData && (
        <div className="mt-2 px-4">
          <MobileWelcomeOnboardingCard
            data={welcomeGuideData}
            onVerifyEmail={!welcomeGuideData.emailVerified ? handleResendVerification : undefined}
            verifyingEmail={sendingEmail}
            onDismiss={clearWelcomeMode}
          />
        </div>
      )}

      {showActivationGuide && activationProgress && (
        <div className="mt-2 px-4">
          <MobileReferralActivationCard
            data={activationProgress}
            welcomeMode={!showWelcomeGuide && onboardingMode}
            onVerifyEmail={!activationProgress.progress.emailVerified ? handleResendVerification : undefined}
            verifyingEmail={sendingEmail}
            onDismiss={activationGuideUi.dismiss}
          />
        </div>
      )}

      {/* ── 积分签到卡 ── */}
      <div className="bg-surface mt-2 px-4 py-4">
        {/* 余额 + 签到 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center">
              <Coins className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pointsBalance}</p>
              <p className="text-xs text-muted">{t('pointsBalance')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCheckin}
            disabled={checkedInToday || checkingIn}
            className={`
              flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors
              ${checkedInToday
                ? 'bg-gray-100 text-muted'
                : 'bg-primary text-white active:bg-primary/90'
              }
            `}
          >
            <CalendarCheck className="w-4 h-4" />
            {checkingIn
              ? '...'
              : checkedInToday
                ? t('alreadyCheckedIn')
                : t('checkin')}
          </button>
        </div>

        {/* 连签天数 */}
        {streakDays > 0 && (
          <p className="text-xs text-muted mb-3">
            {t('streakDays', { count: streakDays })}
          </p>
        )}

        {/* 累计获得 / 已提现 */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <TrendingUp className="w-3.5 h-3.5 text-green-500" />
              <span className="text-sm font-semibold text-foreground">{totalEarned}</span>
            </div>
            <p className="text-xs text-muted">{t('totalEarned')}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <TrendingDown className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-sm font-semibold text-foreground">{totalWithdrawn}</span>
            </div>
            <p className="text-xs text-muted">{t('totalWithdrawn')}</p>
          </div>
        </div>

        {/* 提现 / 提现记录 */}
        <div className="flex items-center justify-center gap-4 pt-3">
          <Link
            href="/account/points/withdraw"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-white text-xs font-medium active:opacity-90"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            {t('withdraw')}
          </Link>
          <Link
            href="/account/points/withdrawals"
            className="flex items-center gap-1 px-4 py-1.5 rounded-full border border-border text-xs text-muted active:opacity-70"
          >
            {t('withdrawalRecords')}
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {referralCode && (
        <div className="mt-2 px-4">
          <ReferralRewardsHub
            code={referralCode}
            totalClicks={referralClicks}
            totalRegistrations={referralRegistrations}
            totalConversions={referralConversions}
            totalEarnings={referralEarnings}
            pointsBalance={pointsBalance}
            variantId={experiment?.variantId}
            placement="account_page"
            compact
            mobileSummary
            onSecondaryAction={() => router.push('/account/referral')}
          />
        </div>
      )}

      {/* ── 数据统计 ── */}
      <div className="grid grid-cols-3 bg-surface mt-px">
        {statsItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center py-4 active:bg-gray-50 transition-colors"
          >
            <span className="text-xl font-bold text-foreground">
              {item.value}
            </span>
            <span className="text-xs text-muted mt-0.5">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* ── 最近浏览 ── */}
      <div className="bg-surface mt-2">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-muted" />
            <span className="text-sm font-medium text-foreground">{t('recentBrowsing')}</span>
          </div>
          <Link
            href="/account/history"
            className="flex items-center gap-0.5 text-xs text-primary active:opacity-70"
          >
            {tc('viewAll')}
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentProducts.length > 0 ? (
          <div className="flex gap-3 px-4 pb-4 overflow-x-auto scrollbar-hide">
            {recentProducts.map((product) => (
              <Link
                key={product.id}
                href={withReturnTo(`/products/${product.slug}`, returnTo)}
                onClick={() => saveReturnScroll(returnTo)}
                className="shrink-0 w-20"
              >
                <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                  {product.images?.[0] ? (
                    <Image
                      src={getImageVariant(product.images[0], 80)}
                      alt={product.title}
                      fill
                      className="object-cover"
                      sizes="80px"
                      referrerPolicy={getImageReferrerPolicy(getImageVariant(product.images[0], 80))}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px]">
                      {t('noImage')}
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-foreground line-clamp-1 mt-1">
                  {product.title}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-4 pb-4">
            <p className="text-xs text-muted text-center py-4">
              {t('noBrowsingHistoryYet')}
            </p>
          </div>
        )}
      </div>

      {/* ── 语言 & 货币 ── */}
      <div className="bg-surface mt-2">
        <button
          type="button"
          onClick={() => setLangSheetOpen(true)}
          className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors border-b border-border"
        >
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-indigo-500" />
            <span className="text-sm text-foreground">{t('language')}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted">{LANGUAGE_LABELS[locale]}</span>
            <ChevronRight className="w-4 h-4 text-muted" />
          </div>
        </button>
        <button
          type="button"
          onClick={() => setCurrencySheetOpen(true)}
          className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-green-500" />
            <span className="text-sm text-foreground">{tCurrency('label')}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted">{tCurrency(currency)}</span>
            <ChevronRight className="w-4 h-4 text-muted" />
          </div>
        </button>
      </div>

      {/* ── 功能列表 ── */}
      <div className="bg-surface mt-2">
        {linkMenuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors border-b border-border last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${item.color}`} />
                <span className="text-sm text-foreground">{item.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted" />
            </Link>
          );
        })}
      </div>

      {/* ── 退出登录 ── */}
      <div className="mt-2 bg-surface">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full py-3.5 text-center text-sm text-red-500 active:bg-red-50 transition-colors"
        >
          {t('logOut')}
        </button>
      </div>

      {/* 底部空白（为 TabBar 留空） */}
      <div className="h-8" />

      <LanguageSheet open={langSheetOpen} onClose={() => setLangSheetOpen(false)} />
      <CurrencySheet open={currencySheetOpen} onClose={() => setCurrencySheetOpen(false)} />
    </div>
  );
}
