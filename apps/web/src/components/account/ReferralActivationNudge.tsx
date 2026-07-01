'use client';

import { ArrowRight, BadgeCheck, Heart, Mail, Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import type { ReferralActivationProgressData } from './ReferralActivationGuide';

interface ReferralActivationNudgeProps {
  data: ReferralActivationProgressData;
  surface: 'product' | 'verify_email';
  onVerifyEmail?: () => void;
  verifyingEmail?: boolean;
  onDismiss?: () => void;
}

export function ReferralActivationNudge({
  data,
  surface,
  onVerifyEmail,
  verifyingEmail = false,
  onDismiss,
}: ReferralActivationNudgeProps) {
  const t = useTranslations('account.referralActivation.nudge');

  const { progress, blockers, status } = data;
  const toneClass =
    status === 'ready'
      ? 'border-emerald-200 bg-emerald-50/80'
      : status === 'rejected'
        ? 'border-amber-200 bg-amber-50/80'
        : 'border-[#ffd7c9] bg-[#fff7f1]';

  const icon =
    blockers.emailVerification
      ? <Mail className="h-4 w-4" />
      : blockers.remainingProductViews > 0
        ? <Search className="h-4 w-4" />
        : blockers.favoriteOrPurchase
          ? <Heart className="h-4 w-4" />
          : <BadgeCheck className="h-4 w-4" />;

  const title =
    status === 'ready'
      ? t('readyTitle')
      : status === 'rejected'
        ? t('rejectedTitle')
        : blockers.emailVerification
          ? t('productTitleVerify')
          : blockers.remainingProductViews > 0
            ? surface === 'verify_email'
              ? t('verifyTitle')
              : blockers.remainingProductViews === 1
                ? t('productTitleViewsOne')
                : t('productTitleViewsMany', { count: blockers.remainingProductViews })
            : blockers.favoriteOrPurchase
              ? surface === 'verify_email'
                ? t('verifyDescriptionAction')
                : t('productTitleAction')
              : t('readyTitle');

  const description =
    status === 'ready' || status === 'rejected'
      ? t('progressLabel', {
        done: progress.completedSteps,
        total: progress.totalSteps,
      })
      : blockers.emailVerification
        ? t('progressLabel', {
          done: progress.completedSteps,
          total: progress.totalSteps,
        })
        : blockers.remainingProductViews > 0
          ? surface === 'verify_email'
            ? t('verifyDescriptionViews', { count: blockers.remainingProductViews })
            : t('progressViews', {
              count: progress.productViews,
              total: progress.requiredProductViews,
            })
          : blockers.favoriteOrPurchase
            ? t('progressLabel', {
              done: progress.completedSteps,
              total: progress.totalSteps,
            })
            : t('progressLabel', {
              done: progress.completedSteps,
              total: progress.totalSteps,
            });

  const action =
    status === 'ready' || status === 'rejected'
      ? (
          <Link href="/account/referral">
            <Button size="sm">{t('viewReferral')}</Button>
          </Link>
        )
      : blockers.emailVerification && onVerifyEmail
        ? (
            <Button size="sm" onClick={onVerifyEmail} loading={verifyingEmail}>
              {t('sendEmail')}
            </Button>
          )
        : blockers.remainingProductViews > 0
          ? (
              <Link href="/products">
                <Button size="sm">{t('browseProducts')}</Button>
              </Link>
            )
          : !blockers.favoriteOrPurchase && surface === 'verify_email'
            ? (
                <Link href="/account/referral">
                  <Button size="sm">{t('viewReferral')}</Button>
                </Link>
              )
            : null;

  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-[0_8px_24px_rgba(28,25,23,0.04)] ${toneClass}`}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm">
          {icon}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t('eyebrow')}
            </span>
            <span className="text-xs text-stone-500">
              {t('progressLabel', {
                done: progress.completedSteps,
                total: progress.totalSteps,
              })}
            </span>
          </div>
          <p className="text-sm font-medium text-stone-900">{title}</p>
          <p className="text-xs text-stone-500">{description}</p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={t('dismiss')}
            title={t('dismiss')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-white hover:text-stone-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {action}
      </div>

      {!blockers.emailVerification && blockers.favoriteOrPurchase && surface === 'product' && (
        <Link
          href="/account/referral"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover"
        >
          <span>{t('viewReferral')}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
