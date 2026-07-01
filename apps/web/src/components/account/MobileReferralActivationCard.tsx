'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Heart,
  Mail,
  Search,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import type { ReferralActivationProgressData } from './ReferralActivationGuide';

interface MobileReferralActivationCardProps {
  data: ReferralActivationProgressData;
  welcomeMode?: boolean;
  onVerifyEmail?: () => void;
  verifyingEmail?: boolean;
  onDismiss?: () => void;
}

export function MobileReferralActivationCard({
  data,
  welcomeMode = false,
  onVerifyEmail,
  verifyingEmail = false,
  onDismiss,
}: MobileReferralActivationCardProps) {
  const t = useTranslations('account.referralActivation.mobileCard');
  const [expanded, setExpanded] = useState(welcomeMode);

  useEffect(() => {
    if (welcomeMode) {
      setExpanded(true);
    }
  }, [welcomeMode]);

  const { progress, blockers, status } = data;
  const summary =
    status === 'rejected'
      ? t('summaryRejected')
      : blockers.emailVerification
        ? t('summaryVerify')
        : blockers.remainingProductViews > 0
          ? t('summaryViews', { count: blockers.remainingProductViews })
          : t('summaryAction');

  const primaryAction =
    status === 'rejected'
      ? (
          <Link href="/account/referral" className="flex-1">
            <Button className="w-full">{t('viewReferral')}</Button>
          </Link>
        )
      : blockers.emailVerification && onVerifyEmail
        ? (
            <Button
              className="flex-1"
              onClick={onVerifyEmail}
              loading={verifyingEmail}
            >
              {t('sendEmail')}
            </Button>
          )
        : blockers.remainingProductViews > 0
          ? (
              <Link href="/products" className="flex-1">
                <Button className="w-full">{t('browseProducts')}</Button>
              </Link>
            )
          : (
              <Link href="/products" className="flex-1">
                <Button className="w-full">{t('finishAction')}</Button>
              </Link>
            );

  return (
    <div className="overflow-hidden rounded-[28px] border border-[#eeded2] bg-[linear-gradient(180deg,#fffdf9_0%,#ffffff_100%)] shadow-[0_10px_24px_rgba(28,25,23,0.06)]">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#fff1e8] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                {t('eyebrow')}
              </span>
              <span className="text-xs font-medium text-stone-500">
                {t('progress', {
                  done: progress.completedSteps,
                  total: progress.totalSteps,
                })}
              </span>
            </div>
            <p className="mt-2 text-base font-semibold leading-tight text-stone-900">
              {summary}
            </p>
          </div>

          <div className="flex items-center gap-1">
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
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-label={expanded ? t('collapse') : t('expand')}
              title={expanded ? t('collapse') : t('expand')}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-stone-500 transition-colors active:bg-white"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100">
          <div
            className="h-full rounded-full bg-[#ff6b47] transition-[width] duration-300"
            style={{
              width: `${(progress.completedSteps / progress.totalSteps) * 100}%`,
            }}
          />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#f1e7dc] bg-white/75 px-4 py-4">
          <div className="space-y-2">
            <MobileStepRow
              icon={<BadgeCheck className="h-4 w-4" />}
              label={t('stepRegistered')}
              done={progress.registered}
              meta={t('done')}
            />
            <MobileStepRow
              icon={<Mail className="h-4 w-4" />}
              label={t('stepEmail')}
              done={progress.emailVerified}
              meta={progress.emailVerified ? t('done') : t('pending')}
            />
            <MobileStepRow
              icon={<Search className="h-4 w-4" />}
              label={t('stepBrowse')}
              done={progress.productViews >= progress.requiredProductViews}
              meta={
                progress.productViews >= progress.requiredProductViews
                  ? t('done')
                  : t('browseMeta', { count: blockers.remainingProductViews })
              }
            />
            <MobileStepRow
              icon={<Heart className="h-4 w-4" />}
              label={t('stepAction')}
              done={progress.hasAction}
              meta={progress.hasAction ? t('done') : t('pending')}
            />
          </div>

          <div className="mt-4 flex items-center gap-3">
            {primaryAction}
            <Link
              href="/account/referral"
              className="shrink-0 text-sm font-medium text-primary"
            >
              {t('viewReferral')}
            </Link>
          </div>
        </div>
      )}
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
    <div className="flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-white px-3 py-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          done ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-500'
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-stone-900">{label}</p>
        <p className={`mt-0.5 text-xs ${done ? 'text-emerald-600' : 'text-stone-500'}`}>
          {meta}
        </p>
      </div>
    </div>
  );
}
