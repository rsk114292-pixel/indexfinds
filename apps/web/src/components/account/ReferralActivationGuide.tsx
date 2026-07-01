'use client';

import type { ReactNode } from 'react';
import { ArrowRight, BadgeCheck, Heart, Mail, Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export interface ReferralActivationProgressData {
  isReferred: boolean;
  status: 'not_referred' | 'in_progress' | 'ready' | 'completed' | 'rejected';
  progress: {
    registered: boolean;
    emailVerified: boolean;
    productViews: number;
    requiredProductViews: number;
    hasAction: boolean;
    completedSteps: number;
    totalSteps: number;
  };
  blockers: {
    emailVerification: boolean;
    remainingProductViews: number;
    favoriteOrPurchase: boolean;
  };
}

interface ReferralActivationGuideProps {
  data: ReferralActivationProgressData;
  welcomeMode?: boolean;
  onVerifyEmail?: () => void;
  verifyingEmail?: boolean;
  onDismiss?: () => void;
}

export function ReferralActivationGuide({
  data,
  welcomeMode = false,
  onVerifyEmail,
  verifyingEmail = false,
  onDismiss,
}: ReferralActivationGuideProps) {
  const t = useTranslations('account.referralActivation.guide');
  const { progress, blockers } = data;

  const title =
    data.status === 'completed'
      ? t('completedTitle')
      : data.status === 'ready'
        ? t('readyTitle')
        : data.status === 'rejected'
          ? t('rejectedTitle')
          : t('title');

  const description =
    data.status === 'completed'
      ? t('completedDescription')
      : data.status === 'ready'
        ? t('readyDescription')
        : data.status === 'rejected'
          ? t('rejectedDescription')
          : t('description');

  const primaryAction =
    blockers.emailVerification && onVerifyEmail
      ? (
          <Button onClick={onVerifyEmail} loading={verifyingEmail}>
            {t('sendEmailCta')}
          </Button>
        )
      : progress.productViews < progress.requiredProductViews
        ? (
            <Link href="/products">
              <Button>{t('browseCta')}</Button>
            </Link>
          )
        : !progress.hasAction
          ? (
              <Link href="/products">
                <Button>{t('actionCta')}</Button>
              </Link>
            )
          : (
              <Link href="/account/referral">
                <Button>{t('referralCta')}</Button>
              </Link>
            );

  return (
    <Card
      padding="lg"
      className="border-[#e7e1d6] bg-[linear-gradient(180deg,#fffdf9_0%,#ffffff_100%)] shadow-[0_12px_28px_rgba(28,25,23,0.05)]"
    >
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div
              className={`inline-flex items-center rounded-full bg-[#fff3e8] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary ${
                welcomeMode ? 'ring-1 ring-[#ffd7c9]' : ''
              }`}
            >
              {t('eyebrow')}
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-semibold leading-tight text-[#1c1917]">
                {title}
              </h3>
              <p className="text-sm text-stone-500">
                {description}
              </p>
            </div>
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label={t('dismiss')}
              title={t('dismiss')}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-white hover:text-stone-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-stone-500">
            <span>{`${progress.completedSteps}/${progress.totalSteps}`}</span>
            <span>
              {progress.completedSteps === progress.totalSteps ? t('done') : t('pending')}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-[#ff6b47] transition-[width] duration-300"
              style={{
                width: `${(progress.completedSteps / progress.totalSteps) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <StepCard
            icon={<BadgeCheck className="h-4 w-4" />}
            label={t('stepRegistered')}
            done={progress.registered}
            meta={t('done')}
          />
          <StepCard
            icon={<Mail className="h-4 w-4" />}
            label={t('stepVerifyEmail')}
            done={progress.emailVerified}
            meta={progress.emailVerified ? t('done') : t('pending')}
          />
          <StepCard
            icon={<Search className="h-4 w-4" />}
            label={t('stepBrowseProducts')}
            done={progress.productViews >= progress.requiredProductViews}
            meta={
              progress.productViews >= progress.requiredProductViews
                ? t('done')
                : blockers.remainingProductViews > 0
                  ? t('browseMore', { count: blockers.remainingProductViews })
                  : t('viewCount', {
                    count: progress.productViews,
                    required: progress.requiredProductViews,
                  })
            }
          />
          <StepCard
            icon={<Heart className="h-4 w-4" />}
            label={t('stepFavoriteOrPurchase')}
            done={progress.hasAction}
            meta={progress.hasAction ? t('done') : t('pending')}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {primaryAction}
          <Link href="/account/referral" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover">
            {t('referralCta')}
            <ArrowRight className="h-4 w-4" />
          </Link>
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
    <div className="rounded-2xl border border-stone-200/80 bg-white/80 px-4 py-3">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full ${
            done ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-500'
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-stone-900">{label}</p>
          <p className={`mt-1 text-xs ${done ? 'text-emerald-600' : 'text-stone-500'}`}>
            {meta}
          </p>
        </div>
      </div>
    </div>
  );
}
