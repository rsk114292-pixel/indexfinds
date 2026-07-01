'use client';

import { CalendarCheck, Eye, Heart, Mail, Share2, User, UserPlus } from 'lucide-react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FIRST_WITHDRAWAL_MIN_POINTS } from '@/features/points/constants';
import { getWaysToEarnCopy } from '@/features/points/ways-to-earn-copy';

export interface WaysToEarnData {
  summary: {
    completedStarterTasks: number;
    totalStarterTasks: number;
    pointsBalance: number;
    pointsToCashout: number;
  };
  starterTasks: Array<{
    id:
      | 'verify_email'
      | 'complete_profile'
      | 'first_intent_action'
      | 'first_share'
      | 'daily_checkin';
    status: 'done' | 'available' | 'today';
    streakCount?: number;
  }>;
  moreWays: Array<{
    id:
      | 'daily_browse_5_products'
      | 'daily_favorite_product'
      | 'share_product'
      | 'invite_friend';
    status: 'done' | 'available' | 'open' | 'in_progress';
    dailyCount?: number;
    dailyLimit?: number;
    dailyTarget?: number;
    clicks?: number;
    registrations?: number;
    conversions?: number;
  }>;
}

interface WaysToEarnPanelProps {
  data: WaysToEarnData;
  compact?: boolean;
  onVerifyEmail?: () => void;
  verifyingEmail?: boolean;
  onCheckin?: () => void;
  checkingIn?: boolean;
}

type TaskStatus = 'done' | 'available' | 'today' | 'open' | 'in_progress';

export function WaysToEarnPanel({
  data,
  compact = false,
  onVerifyEmail,
  verifyingEmail = false,
  onCheckin,
  checkingIn = false,
}: WaysToEarnPanelProps) {
  const locale = useLocale();
  const copy = getWaysToEarnCopy(locale);

  const starterTasks = data.starterTasks.map((task) => {
    const config = copy.tasks[task.id];
    return {
      ...task,
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
      tone:
        task.id === 'verify_email'
          ? ('amber' as const)
          : task.id === 'complete_profile'
            ? ('emerald' as const)
          : task.id === 'first_intent_action'
            ? ('rose' as const)
            : task.id === 'first_share'
              ? ('violet' as const)
              : ('sky' as const),
      ...config,
      progressText:
        task.id === 'daily_checkin'
          ? copy.progress.checkinStreak(task.streakCount ?? 0)
          : undefined,
    };
  });

  const moreWays = data.moreWays.map((task) => {
    const config = copy.tasks[task.id];
    return {
      ...task,
      icon:
        task.id === 'daily_browse_5_products'
          ? Eye
          : task.id === 'daily_favorite_product'
            ? Heart
            : task.id === 'share_product'
              ? Share2
              : UserPlus,
      tone:
        task.id === 'daily_browse_5_products'
          ? ('sky' as const)
          : task.id === 'daily_favorite_product'
            ? ('rose' as const)
            : task.id === 'share_product'
              ? ('violet' as const)
              : ('emerald' as const),
      ...config,
      progressText:
        task.id === 'share_product'
          ? copy.progress.shareToday(task.dailyCount ?? 0, task.dailyLimit ?? 8)
          : task.id === 'invite_friend'
            ? copy.progress.inviteStats(
              task.clicks ?? 0,
              task.registrations ?? 0,
              task.conversions ?? 0,
            )
            : copy.progress.dailyProgress(task.dailyCount ?? 0, task.dailyTarget ?? 1),
    };
  });

  return (
    <Card
      padding={compact ? 'md' : 'lg'}
      className="border-[#e7e1d6] bg-[linear-gradient(180deg,#fffdf9_0%,#ffffff_100%)] shadow-[0_12px_28px_rgba(28,25,23,0.05)]"
    >
      <div className="space-y-5">
        <div className={`flex gap-4 ${compact ? 'flex-col lg:flex-row lg:items-start lg:justify-between' : 'flex-col xl:flex-row xl:items-start xl:justify-between'}`}>
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-full bg-[#fff3e8] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              {copy.eyebrow}
            </div>
            <div className="space-y-1">
              <h3 className={`${compact ? 'text-xl' : 'text-2xl'} font-semibold leading-tight text-[#1c1917]`}>
                {copy.title}
              </h3>
              <p className="text-sm text-stone-500">
                {copy.summaryCompleted(
                  data.summary.completedStarterTasks,
                  data.summary.totalStarterTasks,
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:max-w-[320px]">
            <SummaryCard
              label={copy.pointsBalance}
              value={String(data.summary.pointsBalance)}
            />
            <SummaryCard
              label={copy.summaryCashout(data.summary.pointsToCashout)}
              value={`${Math.max(
                0,
                FIRST_WITHDRAWAL_MIN_POINTS - data.summary.pointsToCashout,
              )}/${FIRST_WITHDRAWAL_MIN_POINTS}`}
            />
          </div>
        </div>

        <TaskGroup
          title={copy.starter}
          tasks={starterTasks}
          compact={compact}
          onVerifyEmail={onVerifyEmail}
          verifyingEmail={verifyingEmail}
          onCheckin={onCheckin}
          checkingIn={checkingIn}
          statuses={copy.statuses}
        />

        <TaskGroup
          title={copy.more}
          tasks={moreWays}
          compact={compact}
          onVerifyEmail={onVerifyEmail}
          verifyingEmail={verifyingEmail}
          onCheckin={onCheckin}
          checkingIn={checkingIn}
          statuses={copy.statuses}
        />

        {compact && (
          <div className="flex justify-end">
            <Link href="/account/points">
              <Button variant="link">{copy.viewAll}</Button>
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}

function TaskGroup({
  title,
  tasks,
  compact,
  onVerifyEmail,
  verifyingEmail,
  onCheckin,
  checkingIn,
  statuses,
}: {
  title: string;
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    reward: string;
    cta: string;
    href?: string;
    status: TaskStatus;
    progressText?: string;
    icon: typeof Mail;
    tone: 'amber' | 'rose' | 'sky' | 'violet' | 'emerald';
  }>;
  compact: boolean;
  onVerifyEmail?: () => void;
  verifyingEmail: boolean;
  onCheckin?: () => void;
  checkingIn: boolean;
  statuses: Record<'done' | 'available' | 'today' | 'open' | 'inProgress', string>;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
        {title}
      </p>
      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            compact={compact}
            onVerifyEmail={onVerifyEmail}
            verifyingEmail={verifyingEmail}
            onCheckin={onCheckin}
            checkingIn={checkingIn}
            statuses={statuses}
          />
        ))}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  compact,
  onVerifyEmail,
  verifyingEmail,
  onCheckin,
  checkingIn,
  statuses,
}: {
  task: {
    id: string;
    title: string;
    description: string;
    reward: string;
    cta: string;
    href?: string;
    status: TaskStatus;
    progressText?: string;
    icon: typeof Mail;
    tone: 'amber' | 'rose' | 'sky' | 'violet' | 'emerald';
  };
  compact: boolean;
  onVerifyEmail?: () => void;
  verifyingEmail: boolean;
  onCheckin?: () => void;
  checkingIn: boolean;
  statuses: Record<'done' | 'available' | 'today' | 'open' | 'inProgress', string>;
}) {
  const Icon = task.icon;
  const toneMap = {
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    sky: 'bg-sky-50 text-sky-600',
    violet: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  } as const;

  const statusLabel =
    task.status === 'in_progress'
      ? statuses.inProgress
      : task.status === 'open'
        ? statuses.open
        : task.status === 'today'
          ? statuses.today
          : task.status === 'available'
            ? statuses.available
            : statuses.done;

  const renderAction = () => {
    if (task.status === 'done') return null;

    if (task.id === 'verify_email' && onVerifyEmail) {
      return (
        <Button size={compact ? 'sm' : 'md'} onClick={onVerifyEmail} loading={verifyingEmail}>
          {task.cta}
        </Button>
      );
    }

    if (task.id === 'daily_checkin' && onCheckin) {
      return (
        <Button size={compact ? 'sm' : 'md'} onClick={onCheckin} loading={checkingIn}>
          {task.cta}
        </Button>
      );
    }

    if (task.href) {
      return (
        <Link href={task.href}>
          <Button size={compact ? 'sm' : 'md'} variant={task.status === 'open' ? 'secondary' : 'primary'}>
            {task.cta}
          </Button>
        </Link>
      );
    }

    return null;
  };

  return (
    <div className={`rounded-[22px] border border-[#ece5d8] bg-white ${compact ? 'p-3' : 'p-4'}`}>
      <div className={`flex ${compact ? 'flex-col gap-3' : 'flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'}`}>
        <div className="min-w-0 flex items-start gap-3">
          <div className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${toneMap[task.tone]}`}>
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-[#1c1917]">{task.title}</p>
              <span className="rounded-full bg-stone-50 px-2 py-0.5 text-xs font-semibold text-primary">
                {task.reward}
              </span>
            </div>
            <p className="mt-1 text-sm leading-6 text-stone-500">{task.description}</p>
            {task.progressText && (
              <p className="mt-1 text-xs text-stone-400">{task.progressText}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <StatusPill status={task.status} label={statusLabel} />
          {renderAction()}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status, label }: { status: TaskStatus; label: string }) {
  const styles =
    status === 'done'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'in_progress'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-stone-100 text-stone-600';

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}>
      {label}
    </span>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[#ece5d8] bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold leading-none text-[#1c1917]">{value}</p>
    </div>
  );
}
