'use client';

import type { ReactNode } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Heart,
  Mail,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export interface WelcomeOnboardingData {
  emailVerified: boolean;
  productViews: number;
  hasSavedFavorite: boolean;
  isReferred: boolean;
}

interface WelcomeOnboardingCardProps {
  data: WelcomeOnboardingData;
  onVerifyEmail?: () => void;
  verifyingEmail?: boolean;
  onDismiss?: () => void;
}

const TOTAL_STEPS = 4;

export function getWelcomeOnboardingCompletedSteps(
  data: WelcomeOnboardingData,
): number {
  return [
    true,
    data.emailVerified,
    data.productViews > 0,
    data.hasSavedFavorite,
  ].filter(Boolean).length;
}

export function WelcomeOnboardingCard({
  data,
  onVerifyEmail,
  verifyingEmail = false,
  onDismiss,
}: WelcomeOnboardingCardProps) {
  const t = useTranslations('account.welcomeGuide');
  const completedSteps = getWelcomeOnboardingCompletedSteps(data);
  const allDone = completedSteps === TOTAL_STEPS;

  const primaryAction = !data.emailVerified && onVerifyEmail
    ? (
        <Button onClick={onVerifyEmail} loading={verifyingEmail}>
          {t('verifyCta')}
        </Button>
      )
    : data.productViews === 0
      ? (
          <Link href="/products">
            <Button>{t('browseCta')}</Button>
          </Link>
        )
      : !data.hasSavedFavorite
        ? (
            <Link href="/products">
              <Button>{t('favoriteCta')}</Button>
            </Link>
          )
        : (
            <Link href="/account">
              <Button>{t('doneCta')}</Button>
            </Link>
          );

  return (
    <Card
      padding="lg"
      className="border-[#dce5df] bg-[linear-gradient(180deg,#f6fbf7_0%,#ffffff_100%)] shadow-[0_12px_28px_rgba(15,23,42,0.05)]"
    >
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-full bg-[#ecf8ef] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1b7f4d] ring-1 ring-[#cfe7d8]">
              {t('eyebrow')}
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-semibold leading-tight text-[#0f172a] text-balance">
                {allDone ? t('completedTitle') : t('title')}
              </h3>
              <p className="max-w-3xl text-sm text-slate-500">
                {allDone
                  ? t('completedDescription')
                  : data.isReferred
                    ? t('referredDescription')
                    : t('description')}
              </p>
            </div>
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label={t('dismiss')}
              title={t('dismiss')}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b7f4d]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {data.isReferred && (
          <div className="flex items-start gap-3 rounded-2xl border border-[#dce5df] bg-white/80 px-4 py-3">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#ecf8ef] text-[#1b7f4d]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">
                {t('referralBadge')}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {t('referralNote')}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>{t('progress', { done: completedSteps, total: TOTAL_STEPS })}</span>
            <span>{allDone ? t('done') : t('pending')}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#2f9e61] transition-[width] duration-300"
              style={{
                width: `${(completedSteps / TOTAL_STEPS) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <StepCard
            icon={<BadgeCheck className="h-4 w-4" aria-hidden="true" />}
            label={t('stepAccount')}
            done
            meta={t('done')}
          />
          <StepCard
            icon={<Mail className="h-4 w-4" aria-hidden="true" />}
            label={t('stepVerifyEmail')}
            done={data.emailVerified}
            meta={data.emailVerified ? t('done') : t('pending')}
          />
          <StepCard
            icon={<Search className="h-4 w-4" aria-hidden="true" />}
            label={t('stepBrowse')}
            done={data.productViews > 0}
            meta={
              data.productViews > 0
                ? t('browseMeta', { count: data.productViews })
                : t('pending')
            }
          />
          <StepCard
            icon={<Heart className="h-4 w-4" aria-hidden="true" />}
            label={t('stepFavorite')}
            done={data.hasSavedFavorite}
            meta={data.hasSavedFavorite ? t('done') : t('pending')}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {primaryAction}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b7f4d]"
            >
              {t('skip')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

function StepCard({
  icon,
  label,
  done,
  meta,
}: {
  icon: ReactNode;
  label: string;
  done: boolean;
  meta: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full ${
            done ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900">{label}</p>
          <p className={`mt-1 text-xs ${done ? 'text-emerald-600' : 'text-slate-500'}`}>
            {meta}
          </p>
        </div>
      </div>
    </div>
  );
}
