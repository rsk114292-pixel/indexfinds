'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { App } from 'antd';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  Heart,
  History,
  Mail,
  ChevronRight,
  Shield,
  MousePointerClick,
  Coins,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Tag } from '@/components/ui/Tag';
import { Spinner } from '@/components/ui/Spinner';
import AvatarUpload from '@/components/account/AvatarUpload';
import {
  ReferralActivationGuide,
  type ReferralActivationProgressData,
} from '@/components/account/ReferralActivationGuide';
import {
  WelcomeOnboardingCard,
  type WelcomeOnboardingData,
} from '@/components/account/WelcomeOnboardingCard';
import { useAuthStore } from '@/stores/useAuthStore';
import { sendVerificationEmail, getProfile, updateUsername } from '@/lib/auth-api';
import { getBrowsingHistory, type BrowsingHistoryItem } from '@/lib/browsing-history';
import { getImageReferrerPolicy, getProductCardThumbnail } from '@/lib/image-utils';
import { fetcher, get } from '@/lib/api';
import { buildReturnTo, withReturnTo } from '@/lib/return-to';
import { saveReturnScroll } from '@/lib/return-scroll';
import { buildAuthRedirectPath, buildLoginHref } from '@/lib/auth-redirect';
import type { Product } from '@/types';
import MobileAccount from './components/mobile/MobileAccount';
import { useReferralRewardsExperiment } from '@/lib/referral-experiment';
import { ReferralRewardsHub } from '@/components/referral/ReferralRewardsHub';
import { useLgUp } from '@/hooks/useLgUp';
import { useReferralActivationVisibility } from '@/hooks/useReferralActivationVisibility';

interface ReferralProgramStats {
  code: string;
  totalClicks: number;
  totalConversions: number;
  totalRegistrations: number;
  totalEarnings: number;
}

export default function AccountOverviewPage() {
  const t = useTranslations('account');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, token, updateUser, isAuthenticated, _hasHydrated } = useAuthStore();
  const experiment = useReferralRewardsExperiment();
  const { message } = App.useApp();
  const lgUp = useLgUp();
  const isDesktopAuthed = _hasHydrated && isAuthenticated && !!token;
  const [hasMounted, setHasMounted] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Stats
  const [favCount, setFavCount] = useState(0);
  const [historyItems, setHistoryItems] = useState<BrowsingHistoryItem[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [referralData, setReferralData] = useState<ReferralProgramStats | null>(null);
  const [activationProgress, setActivationProgress] = useState<ReferralActivationProgressData | null>(null);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const returnTo = useMemo(() => buildReturnTo(pathname, searchParams), [pathname, searchParams]);
  const onboardingMode = searchParams.get('onboarding') === 'welcome';
  const activationGuideUi = useReferralActivationVisibility({
    data: activationProgress,
    surface: 'account',
    userId: user?.id,
  });
  const loginHref = useMemo(
    () => buildLoginHref(buildAuthRedirectPath(pathname, searchParams)),
    [pathname, searchParams],
  );

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Desktop auth guard: redirect to login if not authenticated
  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      // Only redirect on desktop (lg+), mobile MobileAccount handles its own state
      // 不检查 token：页面刷新后 token 需异步恢复，useTokenRecovery 失败后才会设 isAuthenticated=false
      const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
      if (isDesktop) {
        router.replace(loginHref);
      }
    }
  }, [_hasHydrated, isAuthenticated, loginHref, router]);

  useEffect(() => {
    if (!token) return;

    // Refresh user profile
    getProfile().then((data) => updateUser(data)).catch(() => {});

    // Load all stats in parallel
    const loadStats = async () => {
      try {
        const [favRes, referralCodeRes, referralDetailsRes, pointsRes, activationRes] = await Promise.allSettled([
          get<unknown[]>('/favorites').catch(() => []),
          get<{ code: string; totalClicks: number; totalConversions: number }>('/referral/my-code').catch(() => null),
          get<{
            stats: {
              totalClicks: number;
              totalRegistrations: number;
              totalConversions: number;
              totalEarnings: number;
            };
          }>('/referral/details?page=1&limit=1').catch(() => null),
          get<{ balance: number }>('/points/balance').catch(() => null),
          get<ReferralActivationProgressData>('/referral/my-activation').catch(() => null),
        ]);

        if (favRes.status === 'fulfilled') {
          setFavCount(Array.isArray(favRes.value) ? favRes.value.length : 0);
        }
        if (
          referralCodeRes.status === 'fulfilled' &&
          referralCodeRes.value &&
          referralDetailsRes.status === 'fulfilled' &&
          referralDetailsRes.value
        ) {
          setReferralData({
            code: referralCodeRes.value.code,
            totalClicks: referralDetailsRes.value.stats.totalClicks,
            totalConversions: referralDetailsRes.value.stats.totalConversions,
            totalRegistrations: referralDetailsRes.value.stats.totalRegistrations,
            totalEarnings: referralDetailsRes.value.stats.totalEarnings,
          });
        }
        if (pointsRes.status === 'fulfilled' && pointsRes.value) {
          setPointsBalance(pointsRes.value.balance);
        }
        if (activationRes.status === 'fulfilled' && activationRes.value) {
          setActivationProgress(activationRes.value);
        }

        // Load browsing history from localStorage
        const items = getBrowsingHistory();
        setHistoryItems(items);

        // Load recent product details (up to 8)
        const recentIds = items.slice(0, 8).map((i) => i.productId);
        if (recentIds.length > 0) {
          try {
            const productsData = await fetcher<{ data: Product[] }>(`/products?ids=${recentIds.join(',')}&limit=8`);
            if (productsData?.data) {
              // Sort by browsing order
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

  const showActivationGuide = !!activationProgress?.isReferred
    && ['in_progress', 'rejected'].includes(activationProgress.status)
    && !activationGuideUi.dismissed;
  const welcomeGuideData = useMemo<WelcomeOnboardingData | null>(() => {
    if (!user) return null;
    return {
      emailVerified: !!user.emailVerified,
      productViews: historyItems.length,
      hasSavedFavorite: favCount > 0,
      isReferred: !!activationProgress?.isReferred,
    };
  }, [activationProgress?.isReferred, favCount, historyItems.length, user]);
  const showWelcomeGuide = onboardingMode && !loading && !!welcomeGuideData;
  const showEmailVerificationAlert =
    !showActivationGuide && !showWelcomeGuide && !user?.emailVerified;

  const clearWelcomeMode = () => {
    if (!onboardingMode) return;
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('onboarding');
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  return (
    <>
      {!hasMounted ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      ) : !lgUp ? (
        <MobileAccount />
      ) : (
        !isDesktopAuthed ? (
          <div className="flex justify-center items-center h-64">
            <Spinner size="lg" />
          </div>
        ) : !user ? null : (
          <div className="space-y-6">
            {/* Email verification alert */}
            {showEmailVerificationAlert && (
              <Alert
                type="warning"
                title={t('emailNotVerified')}
                description={t('emailNotVerifiedDesc')}
              >
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="primary"
                    loading={sendingEmail}
                    onClick={handleResendVerification}
                    icon={<Mail className="w-4 h-4" />}
                  >
                    {t('sendVerificationEmail')}
                  </Button>
                </div>
              </Alert>
            )}

      {showWelcomeGuide && welcomeGuideData && (
        <WelcomeOnboardingCard
          data={welcomeGuideData}
          onVerifyEmail={!welcomeGuideData.emailVerified ? handleResendVerification : undefined}
          verifyingEmail={sendingEmail}
          onDismiss={clearWelcomeMode}
        />
      )}

      {showActivationGuide && activationProgress && (
        <ReferralActivationGuide
          data={activationProgress}
          welcomeMode={!showWelcomeGuide && onboardingMode}
          onVerifyEmail={!activationProgress.progress.emailVerified ? handleResendVerification : undefined}
          verifyingEmail={sendingEmail}
          onDismiss={activationGuideUi.dismiss}
        />
      )}

      {/* User info card */}
      <Card padding="lg">
        <div className="flex items-center gap-4">
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
                  className="text-lg font-bold text-foreground bg-transparent border-b-2 border-primary outline-none py-0.5 w-48"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-green-600 hover:bg-green-50 transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingName(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-muted hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground truncate">
                  {user.username || t('user')}
                </h2>
                <button
                  type="button"
                  onClick={handleStartEditName}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-muted hover:text-primary hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
                  title={t('editNickname')}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <p className="text-sm text-muted truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              {user.emailVerified ? (
                <Tag color="green" size="sm">{t('verified')}</Tag>
              ) : (
                <Tag color="accent" size="sm">{t('unverified')}</Tag>
              )}
              <Tag size="sm">{user.role}</Tag>
            </div>
          </div>
        </div>
      </Card>

      {referralData && (
        <ReferralRewardsHub
          code={referralData.code}
          totalClicks={referralData.totalClicks}
          totalRegistrations={referralData.totalRegistrations}
          totalConversions={referralData.totalConversions}
          totalEarnings={referralData.totalEarnings}
          pointsBalance={pointsBalance}
          variantId={experiment?.variantId}
          placement="account_page"
          compact
          onSecondaryAction={() => router.push('/account/referral')}
        />
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-3">
        <Link href="/account/favorites">
          <Card hoverable padding="md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 text-red-500" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground">
                  {loading ? '-' : favCount}
                </p>
                <p className="text-xs text-muted">{t('favorites')}</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/account/history">
          <Card hoverable padding="md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <History className="w-5 h-5 text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground">
                  {loading ? '-' : historyItems.length}
                </p>
                <p className="text-xs text-muted">{t('statsViewed')}</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/account/referral">
          <Card hoverable padding="md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                <MousePointerClick className="w-5 h-5 text-orange-500" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground">
                  {loading ? '-' : (referralData?.totalClicks ?? 0)}
                </p>
                <p className="text-xs text-muted">{t('statsRefClicks')}</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/account/points">
          <Card hoverable padding="md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center shrink-0">
                <Coins className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground">
                  {loading ? '-' : pointsBalance}
                </p>
                <p className="text-xs text-muted">{t('points')}</p>
              </div>
            </div>
          </Card>
        </Link>

      </div>

      {/* Recent browsing preview */}
      <Card padding="none">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-muted" />
            <span className="font-medium text-foreground text-sm">{t('recentBrowsing')}</span>
          </div>
          <Link
            href="/account/history"
            className="flex items-center gap-1 text-sm text-primary hover:text-primary-hover transition-colors"
          >
            {tCommon('viewAll')}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : recentProducts.length === 0 ? (
            <p className="text-center text-muted text-sm py-8">
              {t('noBrowsingHistoryYet')}
            </p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-4 gap-3">
              {recentProducts.slice(0, 8).map((product) => (
                <Link
                  key={product.id}
                  href={withReturnTo(`/products/${product.slug}`, returnTo)}
                  onClick={() => saveReturnScroll(returnTo)}
                >
                  <div className="group cursor-pointer">
                    <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                      {product.images?.[0] ? (
                        <Image
                          src={getProductCardThumbnail(product.images[0])}
                          alt={product.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                          sizes="(max-width: 640px) 25vw, 16vw"
                          referrerPolicy={getImageReferrerPolicy(getProductCardThumbnail(product.images[0]))}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          {t('noImage')}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-foreground line-clamp-1 mt-1.5 group-hover:text-primary transition-colors">
                      {product.title}
                    </p>
                    <p className="text-xs font-semibold text-primary">
                      ¥{product.priceMin}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Quick links */}
      <Card padding="none">
        <Link
          href="/account/security"
          className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-muted" />
            <div>
              <p className="text-sm font-medium text-foreground">{t('securitySettings')}</p>
              <p className="text-xs text-muted">{t('securitySettingsDesc')}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted" />
        </Link>
          </Card>
        </div>
        )
      )}
    </>
  );
}
