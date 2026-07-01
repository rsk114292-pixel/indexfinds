'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { App } from 'antd';
import useSWR from 'swr';
import { Coins, ArrowDownToLine, CalendarCheck, TrendingUp, TrendingDown, FileText, Info, ChevronDown, ChevronUp, Eye, Heart, Mail, Share2, User, UserPlus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import MobileSubPageHeader from '@/components/mobile/MobileSubPageHeader';
import { useAuthStore } from '@/stores/useAuthStore';
import { fetcher, post } from '@/lib/api';
import { sendVerificationEmail } from '@/lib/auth-api';
import { WaysToEarnPanel, type WaysToEarnData } from '@/components/points/WaysToEarnPanel';
import { buildAuthRedirectPath, buildLoginHref } from '@/lib/auth-redirect';
import {
  getPointsPageCopy,
  type PointsPageCopy,
} from '@/features/points/points-copy';
import { getWaysToEarnCopy } from '@/features/points/ways-to-earn-copy';

interface BalanceData {
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
}

interface CheckinStatus {
  checkedInToday: boolean;
  streakCount: number;
  monthlyCheckins: string[];
}

interface Transaction {
  id: string;
  type: string;
  action?: string;
  amount: number;
  description: string;
  createdAt: string;
}

interface TransactionsResponse {
  items: Transaction[];
  total: number;
}

export default function AccountPointsPage() {
  const t = useTranslations('account');
  const locale = useLocale();
  const pageCopy = getPointsPageCopy(locale);
  const { message } = App.useApp();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { token, isAuthenticated, _hasHydrated } = useAuthStore();
  const [checkingIn, setCheckingIn] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;
  const loginHref = buildLoginHref(buildAuthRedirectPath(pathname, searchParams));

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.replace(loginHref);
    }
  }, [_hasHydrated, isAuthenticated, loginHref, router]);

  // Fetch balance
  const { data: balanceData, isLoading: balanceLoading } = useSWR<BalanceData>(
    token ? '/points/balance' : null,
    fetcher,
    { dedupingInterval: 30_000 },
  );

  // Fetch checkin status
  const { data: checkinData, isLoading: checkinLoading, mutate: mutateCheckin } = useSWR<CheckinStatus>(
    token ? '/checkin/status' : null,
    fetcher,
    { dedupingInterval: 30_000 },
  );

  // Fetch transactions
  const { data: txData, isLoading: txLoading } = useSWR<TransactionsResponse>(
    token ? `/points/transactions?page=${page}&limit=${limit}` : null,
    fetcher,
    { dedupingInterval: 30_000 },
  );

  const { data: waysToEarnData, isLoading: waysLoading } = useSWR<WaysToEarnData>(
    token ? '/points/ways-to-earn' : null,
    fetcher,
    { dedupingInterval: 30_000 },
  );

  const [sendingEmail, setSendingEmail] = useState(false);

  const handleCheckin = async () => {
    setCheckingIn(true);
    try {
      await post('/checkin');
      message.success(t('checkinSuccess'));
      mutateCheckin();
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

  // Build calendar grid for current month
  const calendarData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = now.getDate();

    const checkedSet = new Set(
      (checkinData?.monthlyCheckins || []).map((d) => {
        const date = new Date(d);
        return date.getDate();
      }),
    );

    return { year, month, firstDay, daysInMonth, today, checkedSet };
  }, [checkinData]);

  const totalPages = txData ? Math.ceil(txData.total / limit) : 1;

  const loading = !token || balanceLoading || waysLoading;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MobileSubPageHeader title={t('points')} />
      <h2 className="hidden lg:block text-lg font-bold text-foreground">{t('points')}</h2>

      <div className="hidden lg:block space-y-6">
        {/* Balance Card */}
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="w-5 h-5 text-primary" />
            <h3 className="text-base font-semibold text-foreground">{t('pointsBalance')}</h3>
          </div>
          <div className="text-center py-4">
            <p className="text-5xl font-bold text-primary mb-2">
              {balanceData?.balance ?? 0}
            </p>
            <p className="text-sm text-muted">{t('pointsBalance')}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-lg font-bold text-foreground">
                  {balanceData?.totalEarned ?? 0}
                </span>
              </div>
              <p className="text-xs text-muted">{t('totalEarned')}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingDown className="w-4 h-4 text-orange-500" />
                <span className="text-lg font-bold text-foreground">
                  {balanceData?.totalWithdrawn ?? 0}
                </span>
              </div>
              <p className="text-xs text-muted">{t('totalWithdrawn')}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-center gap-3">
            <Link href="/account/points/withdraw">
              <Button variant="primary" icon={<ArrowDownToLine className="w-4 h-4" />}>
                {t('withdraw')}
              </Button>
            </Link>
            <Link href="/account/points/withdrawals">
              <Button variant="ghost" icon={<FileText className="w-4 h-4" />}>
                {t('withdrawalRecords')}
              </Button>
            </Link>
          </div>
        </Card>

        {waysToEarnData && (
          <WaysToEarnPanel
            data={waysToEarnData}
            onVerifyEmail={waysToEarnData.starterTasks.some((task) => task.id === 'verify_email' && task.status !== 'done') ? handleResendVerification : undefined}
            verifyingEmail={sendingEmail}
            onCheckin={waysToEarnData.starterTasks.some((task) => task.id === 'daily_checkin' && task.status !== 'done') ? handleCheckin : undefined}
            checkingIn={checkingIn}
          />
        )}

        {/* Checkin Section */}
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <CalendarCheck className="w-5 h-5 text-primary" />
            <h3 className="text-base font-semibold text-foreground">{t('checkin')}</h3>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              {checkinData && (
                <p className="text-sm text-muted">
                  {t('streakDays', { count: checkinData.streakCount })}
                </p>
              )}
            </div>
            <Button
              variant={checkinData?.checkedInToday ? 'ghost' : 'primary'}
              loading={checkingIn || checkinLoading}
              disabled={checkinData?.checkedInToday}
              onClick={handleCheckin}
            >
              {checkinData?.checkedInToday ? t('alreadyCheckedIn') : t('checkin')}
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="mt-4">
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted mb-2">
              {pageCopy.weekdays.map((day) => (
                <div key={day} className="py-1 font-medium">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {Array.from({ length: calendarData.firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="py-1.5" />
              ))}
              {Array.from({ length: calendarData.daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isChecked = calendarData.checkedSet.has(day);
                const isToday = day === calendarData.today;
                return (
                  <div
                    key={day}
                    className={`
                      py-1.5 rounded-md text-xs
                      ${isChecked
                        ? 'bg-primary text-white font-semibold'
                        : isToday
                          ? 'bg-primary/10 text-primary font-semibold ring-1 ring-primary/30'
                          : 'text-foreground'
                      }
                    `}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4 lg:hidden">
        <MobilePointsSummary
          t={t}
          balance={balanceData?.balance ?? 0}
          totalEarned={balanceData?.totalEarned ?? 0}
          totalWithdrawn={balanceData?.totalWithdrawn ?? 0}
        />

        {waysToEarnData && (
          <MobileWaysToEarnSection
            locale={locale}
            data={waysToEarnData}
            onVerifyEmail={handleResendVerification}
            verifyingEmail={sendingEmail}
            onCheckin={handleCheckin}
            checkingIn={checkingIn}
          />
        )}

        <MobileCheckinCard
          t={t}
          pageCopy={pageCopy}
          checkinData={checkinData}
          checkingIn={checkingIn || checkinLoading}
          onCheckin={handleCheckin}
          calendarData={calendarData}
        />
      </div>

      {/* Points Rules */}
      <PointsRulesCard t={t} locale={locale} />

      {/* Transactions History — Desktop: pagination */}
      <div className="hidden lg:block">
        <Card padding="none">
          <div className="p-4 border-b border-border">
            <h3 className="text-base font-semibold text-foreground">{t('pointsHistory')}</h3>
          </div>

          {txLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : !txData?.items?.length ? (
            <div className="py-8 text-center text-sm text-muted">
              {t('noTransactions')}
            </div>
          ) : (
            <>
              <TransactionList items={txData.items} locale={locale} />
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 p-4 border-t border-border">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    &lt;
                  </Button>
                  <span className="text-sm text-muted">
                    {page} / {totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    &gt;
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Transactions History — Mobile: infinite scroll */}
      <div className="lg:hidden">
        <MobileTransactions token={token} locale={locale} t={t} />
      </div>
    </div>
  );
}

const POINTS_RULES_COPY = {
  en: [
    { label: 'New user registration', pts: '+5' },
    { label: 'Verify your email', pts: '+5' },
    { label: 'Complete your profile', pts: '+2' },
    { label: 'First favorite or buy click', pts: '+2' },
    { label: 'First product share', pts: '+3' },
    { label: 'Daily check-in', pts: '+1' },
    { label: '7-day check-in streak', pts: '+5' },
    { label: '30-day check-in streak', pts: '+20' },
    { label: 'Browse 5 different products today', pts: '+1' },
    { label: 'Favorite 1 product today', pts: '+1' },
    { label: 'Share a product, once per channel each day', pts: '+1' },
    { label: 'Referral email verification bonus', pts: '+5' },
    { label: 'Referral conversion reward', pts: '+20~80' },
  ],
  zh: [
    { label: '新用户注册', pts: '+5' },
    { label: '验证邮箱', pts: '+5' },
    { label: '完善个人资料', pts: '+2' },
    { label: '首次收藏商品或点击购买', pts: '+2' },
    { label: '首次分享商品', pts: '+3' },
    { label: '每日签到', pts: '+1' },
    { label: '连续签到第 7 天', pts: '+5' },
    { label: '连续签到第 30 天', pts: '+20' },
    { label: '每日浏览 5 个不同商品', pts: '+1' },
    { label: '每日收藏 1 个商品', pts: '+1' },
    { label: '分享商品，每个渠道每天 1 次', pts: '+1' },
    { label: '推荐用户邮箱验证奖励', pts: '+5' },
    { label: '推荐有效转化奖励', pts: '+20~80' },
  ],
} as const;

const WITHDRAW_RULES = [
  'ruleWithdrawRate',
  'ruleWithdrawMin',
  'ruleWithdrawMonthly',
] as const;

function getTransactionLabel(tx: Transaction, locale: string) {
  const copy = getPointsPageCopy(locale);

  if (tx.action) {
    const byAction =
      copy.transactionActions[
        tx.action as keyof typeof copy.transactionActions
      ];
    if (byAction) return byAction;
  }

  const byDescription =
    copy.transactionDescriptions[
      tx.description as keyof typeof copy.transactionDescriptions
    ];
  if (byDescription) return byDescription;

  if (tx.description.startsWith('Milestone bonus:')) {
    const suffix = tx.description.replace('Milestone bonus:', '').trim();
    return `${copy.milestonePrefix} ${suffix}`.trim();
  }

  const expiredMatch = tx.description.match(/^(\d+)\s+points expired$/);
  if (expiredMatch) {
    return locale === 'en'
      ? tx.description
      : `${expiredMatch[1]} ${copy.pointsExpiredSuffix}`;
  }

  return tx.description;
}

function PointsRulesCard({ t, locale }: { t: (key: string) => string; locale: string }) {
  const [open, setOpen] = useState(false);
  const rules =
    locale === 'zh' ? POINTS_RULES_COPY.zh : POINTS_RULES_COPY.en;
  return (
    <Card padding="none">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 active:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">{t('pointsRules')}</h3>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          <div className="space-y-2">
            {rules.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-foreground">{r.label}</span>
                <span className="text-primary font-semibold">{r.pts}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 space-y-1.5">
            {WITHDRAW_RULES.map((key) => (
              <p key={key} className="text-xs text-muted">{t(key)}</p>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function MobilePointsSummary({
  t,
  balance,
  totalEarned,
  totalWithdrawn,
}: {
  t: (key: string, values?: Record<string, string | number | Date>) => string;
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
}) {
  return (
    <Card padding="md" className="border-[#ece5d8] bg-[linear-gradient(180deg,#fffdf9_0%,#ffffff_100%)] shadow-[0_8px_20px_rgba(28,25,23,0.04)]">
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-stone-500">{t('pointsBalance')}</p>
          <div className="mt-2 flex items-end gap-1">
            <span className="text-4xl font-semibold leading-none text-primary">{balance}</span>
            <span className="pb-1 text-sm text-stone-500">{t('pointsUnit')}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#ece5d8] bg-white px-3 py-3">
            <div className="flex items-center gap-1.5 text-green-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-lg font-semibold leading-none">{totalEarned}</span>
            </div>
            <p className="mt-1 text-xs text-stone-500">{t('totalEarned')}</p>
          </div>
          <div className="rounded-2xl border border-[#ece5d8] bg-white px-3 py-3">
            <div className="flex items-center gap-1.5 text-orange-500">
              <TrendingDown className="w-4 h-4" />
              <span className="text-lg font-semibold leading-none">{totalWithdrawn}</span>
            </div>
            <p className="mt-1 text-xs text-stone-500">{t('totalWithdrawn')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/account/points/withdraw" className="flex-1">
            <Button size="sm" className="w-full" icon={<ArrowDownToLine className="w-4 h-4" />}>
              {t('withdraw')}
            </Button>
          </Link>
          <Link href="/account/points/withdrawals" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            <FileText className="w-4 h-4" />
            {t('withdrawalRecords')}
          </Link>
        </div>
      </div>
    </Card>
  );
}

function MobileWaysToEarnSection({
  locale,
  data,
  onVerifyEmail,
  verifyingEmail,
  onCheckin,
  checkingIn,
}: {
  locale: string;
  data: WaysToEarnData;
  onVerifyEmail: () => void;
  verifyingEmail: boolean;
  onCheckin: () => void;
  checkingIn: boolean;
}) {
  const copy = getWaysToEarnCopy(locale);

  const starterTasks = data.starterTasks.map((task) => ({
    ...task,
    config: copy.tasks[task.id],
    icon:
      task.id === 'verify_email'
        ? Mail
        : task.id === 'complete_profile'
          ? User
        : task.id === 'first_intent_action'
          ? Heart
          : task.id === 'first_share'
            ? Share2
            : CalendarCheck,
    progressText:
      task.id === 'daily_checkin'
        ? copy.progress.checkinStreak(task.streakCount ?? 0)
        : undefined,
  }));

  const moreWays = data.moreWays.map((task) => ({
    ...task,
    config: copy.tasks[task.id],
    icon:
      task.id === 'daily_browse_5_products'
        ? Eye
        : task.id === 'daily_favorite_product'
          ? Heart
          : task.id === 'share_product'
            ? Share2
            : UserPlus,
    progressText:
      task.id === 'share_product'
        ? copy.progress.shareToday(task.dailyCount ?? 0, task.dailyLimit ?? 8)
        : task.id === 'invite_friend'
          ? copy.progress.inviteStats(task.clicks ?? 0, task.registrations ?? 0, task.conversions ?? 0)
          : copy.progress.dailyProgress(task.dailyCount ?? 0, task.dailyTarget ?? 1),
  }));

  return (
    <Card padding="md" className="border-[#ece5d8] bg-[linear-gradient(180deg,#fffdf9_0%,#ffffff_100%)] shadow-[0_8px_20px_rgba(28,25,23,0.04)]">
      <div className="space-y-4">
        <div>
          <div className="inline-flex items-center rounded-full bg-[#fff3e8] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            {copy.eyebrow}
          </div>
          <p className="mt-3 text-lg font-semibold leading-tight text-[#1c1917]">
            {copy.title}
          </p>
          <p className="mt-1 text-sm text-stone-500">
            {copy.summaryCompleted(data.summary.completedStarterTasks, data.summary.totalStarterTasks)}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">{copy.starter}</p>
          {starterTasks.map((task) => (
            <MobileTaskRow
              key={task.id}
              icon={task.icon}
              title={task.config.title}
              reward={task.config.reward}
              status={task.status === 'today' ? copy.statuses.today : copy.statuses[task.status]}
              progressText={task.progressText}
              action={task.id === 'verify_email' ? (
                <Button
                  size="sm"
                  variant={task.status === 'done' ? 'ghost' : 'primary'}
                  loading={verifyingEmail}
                  disabled={task.status === 'done'}
                  onClick={onVerifyEmail}
                >
                  {task.status === 'done' ? copy.statuses.done : task.config.cta}
                </Button>
              ) : task.id === 'daily_checkin' ? (
                <Button
                  size="sm"
                  variant={task.status === 'done' ? 'ghost' : 'primary'}
                  loading={checkingIn}
                  disabled={task.status === 'done'}
                  onClick={onCheckin}
                >
                  {task.status === 'done' ? copy.statuses.done : task.config.cta}
                </Button>
              ) : (
                <Link href={'href' in task.config ? task.config.href : '/products'}>
                  <Button size="sm" variant={task.status === 'done' ? 'ghost' : 'secondary'}>
                    {task.status === 'done' ? copy.statuses.done : task.config.cta}
                  </Button>
                </Link>
              )}
            />
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">{copy.more}</p>
          {moreWays.map((task) => (
            <MobileTaskRow
              key={task.id}
              icon={task.icon}
              title={task.config.title}
              reward={task.config.reward}
              status={task.status === 'in_progress' ? copy.statuses.inProgress : copy.statuses[task.status]}
              progressText={task.progressText}
              action={(
                <Link href={'href' in task.config ? task.config.href : '/account/referral'}>
                  <Button size="sm" variant={task.status === 'done' ? 'ghost' : 'secondary'}>
                    {task.config.cta}
                  </Button>
                </Link>
              )}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

function MobileTaskRow({
  icon: Icon,
  title,
  reward,
  status,
  progressText,
  action,
}: {
  icon: typeof Mail;
  title: string;
  reward: string;
  status: string;
  progressText?: string;
  action: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#ece5d8] bg-white px-3 py-3">
      <div className="flex flex-col gap-3">
        <div className="min-w-0 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-stone-50 text-primary">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-[#1c1917]">{title}</p>
              <span className="text-xs font-semibold text-primary">{reward}</span>
            </div>
            <p className="mt-1 text-xs text-stone-500">
              {progressText ?? status}
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          {action}
        </div>
      </div>
    </div>
  );
}

function MobileCheckinCard({
  t,
  pageCopy,
  checkinData,
  checkingIn,
  onCheckin,
  calendarData,
}: {
  t: (key: string, values?: Record<string, string | number | Date>) => string;
  pageCopy: PointsPageCopy;
  checkinData?: CheckinStatus;
  checkingIn: boolean;
  onCheckin: () => void;
  calendarData: {
    firstDay: number;
    daysInMonth: number;
    today: number;
    checkedSet: Set<number>;
  };
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-[20px] border border-[#ece5d8] bg-white">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-4 h-4 text-primary" />
          <div>
            <p className="text-sm font-semibold text-[#1c1917]">{t('checkin')}</p>
            <p className="text-xs text-stone-500">
              {checkinData ? t('streakDays', { count: checkinData.streakCount }) : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500">
            {checkinData?.checkedInToday ? t('alreadyCheckedIn') : t('checkin')}
          </span>
          <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="border-t border-[#f1ece2] px-4 py-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[#1c1917]">{t('checkin')}</p>
              <p className="mt-1 text-xs text-stone-500">
                {checkinData?.checkedInToday
                  ? t('alreadyCheckedIn')
                  : t('ruleCheckin')}
              </p>
            </div>
            <Button
              size="sm"
              variant={checkinData?.checkedInToday ? 'ghost' : 'primary'}
              loading={checkingIn}
              disabled={checkinData?.checkedInToday}
              onClick={onCheckin}
            >
              {checkinData?.checkedInToday ? t('alreadyCheckedIn') : t('checkin')}
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-stone-400">
            {pageCopy.weekdays.map((day) => (
              <div key={day} className="py-1 font-medium">{day}</div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: calendarData.firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="py-1.5" />
            ))}
            {Array.from({ length: calendarData.daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isChecked = calendarData.checkedSet.has(day);
              const isToday = day === calendarData.today;
              return (
                <div
                  key={day}
                  className={`
                    py-1.5 rounded-md
                    ${isChecked
                      ? 'bg-primary text-white font-semibold'
                      : isToday
                        ? 'bg-primary/10 text-primary font-semibold ring-1 ring-primary/30'
                        : 'text-foreground'
                    }
                  `}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TransactionList({ items, locale }: { items: Transaction[]; locale: string }) {
  return (
    <div className="divide-y divide-border">
      {items.map((tx) => (
        <div key={tx.id} className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-foreground truncate">{getTransactionLabel(tx, locale)}</p>
            <p className="text-xs text-muted mt-0.5">
              {new Date(tx.createdAt).toLocaleDateString(locale, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <span
            className={`text-sm font-semibold shrink-0 ml-3 ${
              tx.amount > 0 ? 'text-green-600' : 'text-orange-600'
            }`}
          >
            {tx.amount > 0 ? '+' : ''}{tx.amount}
          </span>
        </div>
      ))}
    </div>
  );
}

const MOBILE_TX_LIMIT = 15;

function MobileTransactions({ token, locale, t }: { token: string | null; locale: string; t: (key: string) => string }) {
  const [items, setItems] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    if (!token) return;
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const data = await fetcher<TransactionsResponse>(`/points/transactions?page=${pageNum}&limit=${MOBILE_TX_LIMIT}`);
      const newItems = data?.items ?? [];
      if (append) {
        setItems((prev) => [...prev, ...newItems]);
      } else {
        setItems(newItems);
      }
      setHasMore(newItems.length >= MOBILE_TX_LIMIT);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          const next = page + 1;
          setPage(next);
          fetchPage(next, true);
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page, fetchPage]);

  return (
    <Card padding="none">
      <div className="p-4 border-b border-border">
        <h3 className="text-base font-semibold text-foreground">{t('pointsHistory')}</h3>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : !items.length ? (
        <div className="py-8 text-center text-sm text-muted">{t('noTransactions')}</div>
      ) : (
        <>
          <TransactionList items={items} locale={locale} />
          <div ref={sentinelRef} className="h-1" />
          {loadingMore && (
            <div className="flex justify-center py-4"><Spinner /></div>
          )}
        </>
      )}
    </Card>
  );
}
