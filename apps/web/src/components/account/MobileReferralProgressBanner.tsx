'use client';

import { BadgeCheck, Heart, Mail, Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import type { ReferralActivationProgressData } from './ReferralActivationGuide';

interface MobileReferralProgressBannerProps {
  data: ReferralActivationProgressData;
  surface: 'product' | 'verify_email';
  onVerifyEmail?: () => void;
  verifyingEmail?: boolean;
  onDismiss?: () => void;
}

export function MobileReferralProgressBanner({
  data,
  surface,
  onVerifyEmail,
  verifyingEmail = false,
  onDismiss,
}: MobileReferralProgressBannerProps) {
  const t = useTranslations('account.referralActivation.mobileBanner');
  const { progress, blockers, status } = data;

  const icon =
    status === 'rejected'
      ? <BadgeCheck className="h-4 w-4" />
      : blockers.emailVerification
        ? <Mail className="h-4 w-4" />
        : blockers.remainingProductViews > 0
          ? <Search className="h-4 w-4" />
          : <Heart className="h-4 w-4" />;

  const title =
    status === 'rejected'
      ? t('rejectedTitle')
      : blockers.emailVerification
        ? t('verifyTitle')
        : blockers.remainingProductViews > 0
          ? blockers.remainingProductViews === 1
            ? t('viewsTitleOne')
            : t('viewsTitleMany', { count: blockers.remainingProductViews })
          : t('actionTitle');

  const description =
    status === 'rejected'
      ? t('rejectedDescription')
      : blockers.emailVerification
        ? t('verifyDescription')
        : blockers.remainingProductViews > 0
          ? t('viewsDescription', {
            count: progress.productViews,
            total: progress.requiredProductViews,
          })
          : t('actionDescription');

  const action =
    status === 'rejected'
      ? (
          <Link href="/account/referral">
            <Button size="sm" variant="ghost">{t('viewReferral')}</Button>
          </Link>
        )
      : blockers.emailVerification && onVerifyEmail
        ? (
            <Button size="sm" onClick={onVerifyEmail} loading={verifyingEmail}>
              {t('sendEmail')}
            </Button>
          )
        : surface === 'verify_email'
          ? (
              <Link href="/products">
                <Button size="sm" variant="ghost">{t('browseProducts')}</Button>
              </Link>
            )
          : null;

  return (
    <div className="rounded-[22px] border border-[#f0d9cd] bg-[linear-gradient(180deg,#fff9f4_0%,#fffdfa_100%)] px-3.5 py-3 shadow-[0_8px_20px_rgba(28,25,23,0.04)]">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              {t('eyebrow')}
            </span>
            <span className="text-[11px] text-stone-500">
              {t('progress', {
                done: progress.completedSteps,
                total: progress.totalSteps,
              })}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold leading-tight text-stone-900">
            {title}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-stone-500">
            {description}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {action}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label={t('dismiss')}
              title={t('dismiss')}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors active:bg-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
