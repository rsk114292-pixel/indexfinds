'use client';

import type { ReactNode } from 'react';
import {
  BadgeCheck,
  Heart,
  Mail,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import {
  getWelcomeOnboardingCompletedSteps,
  type WelcomeOnboardingData,
} from './WelcomeOnboardingCard';

interface MobileWelcomeOnboardingCardProps {
  data: WelcomeOnboardingData;
  onVerifyEmail?: () => void;
  verifyingEmail?: boolean;
  onDismiss?: () => void;
}

const TOTAL_STEPS = 4;

export function MobileWelcomeOnboardingCard({
  data,
  onVerifyEmail,
  verifyingEmail = false,
  onDismiss,
}: MobileWelcomeOnboardingCardProps) {
  const t = useTranslations('account.welcomeGuide');
  const completedSteps = getWelcomeOnboardingCompletedSteps(data);
  const allDone = completedSteps === TOTAL_STEPS;

  const primaryAction = !data.emailVerified && onVerifyEmail
    ? (
        <Button
          className="w-full"
          onClick={onVerifyEmail}
          loading={verifyingEmail}
        >
          {t('verifyCta')}
        </Button>
      )
    : data.productViews === 0
      ? (
          <Link href="/products" className="w-full">
            <Button className="w-full">{t('browseCta')}</Button>
          </Link>
        )
      : !data.hasSavedFavorite
        ? (
            <Link href="/products" className="w-full">
              <Button className="w-full">{t('favoriteCta')}</Button>
            </Link>
          )
        : (
            <Link href="/account" className="w-full">
              <Button className="w-full">{t('doneCta')}</Button>
            </Link>
          );

  return (
    <div className="overflow-hidden rounded-[28px] border border-[#dce5df] bg-[linear-gradient(180deg,#f6fbf7_0%,#ffffff_100%)] shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#ecf8ef] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1b7f4d]">
                {t('eyebrow')}
              </span>
              <span className="text-xs font-medium text-slate-500">
                {t('progress', { done: completedSteps, total: TOTAL_STEPS })}
              </span>
            </div>
            <p className="mt-2 text-base font-semibold leading-tight text-slate-900">
              {allDone ? t('completedTitle') : t('title')}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {allDone
                ? t('completedDescription')
                : data.isReferred
                  ? t('referredDescription')
                  : t('description')}
            </p>
          </div>

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label={t('dismiss')}
              title={t('dismiss')}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors active:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b7f4d]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#2f9e61] transition-[width] duration-300"
            style={{
              width: `${(completedSteps / TOTAL_STEPS) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="border-t border-[#e4ece6] bg-white/80 px-4 py-4">
        {data.isReferred && (
          <div className="mb-3 flex items-start gap-3 rounded-2xl border border-[#dce5df] bg-[#f8fcf9] px-3 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ecf8ef] text-[#1b7f4d]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">
                {t('referralBadge')}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {t('referralNote')}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <MobileStepRow
            icon={<BadgeCheck className="h-4 w-4" aria-hidden="true" />}
            label={t('stepAccount')}
            done
            meta={t('done')}
          />
          <MobileStepRow
            icon={<Mail className="h-4 w-4" aria-hidden="true" />}
            label={t('stepVerifyEmail')}
            done={data.emailVerified}
            meta={data.emailVerified ? t('done') : t('pending')}
          />
          <MobileStepRow
            icon={<Search className="h-4 w-4" aria-hidden="true" />}
            label={t('stepBrowse')}
            done={data.productViews > 0}
            meta={
              data.productViews > 0
                ? t('browseMeta', { count: data.productViews })
                : t('pending')
            }
          />
          <MobileStepRow
            icon={<Heart className="h-4 w-4" aria-hidden="true" />}
            label={t('stepFavorite')}
            done={data.hasSavedFavorite}
            meta={data.hasSavedFavorite ? t('done') : t('pending')}
          />
        </div>

        <div className="mt-4 space-y-3">
          {primaryAction}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="w-full text-center text-sm font-medium text-slate-500 transition-colors active:text-slate-700"
            >
              {t('skip')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MobileStepRow({
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
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          done ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className={`mt-0.5 text-xs ${done ? 'text-emerald-600' : 'text-slate-500'}`}>
          {meta}
        </p>
      </div>
    </div>
  );
}
