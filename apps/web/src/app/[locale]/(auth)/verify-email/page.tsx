'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { Result } from '@/components/ui/Result';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ReferralActivationNudge } from '@/components/account/ReferralActivationNudge';
import { MobileReferralProgressBanner } from '@/components/account/MobileReferralProgressBanner';
import type { ReferralActivationProgressData } from '@/components/account/ReferralActivationGuide';
import { verifyEmail, getProfile } from '@/lib/auth-api';
import { get } from '@/lib/api';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTranslations } from 'next-intl';
import { useReferralActivationVisibility } from '@/hooks/useReferralActivationVisibility';
import { useLgUp } from '@/hooks/useLgUp';

type Status = 'loading' | 'success' | 'error';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [activationProgress, setActivationProgress] = useState<ReferralActivationProgressData | null>(null);
  const t = useTranslations('auth');
  const { isAuthenticated, updateUser, user } = useAuthStore();
  const lgUp = useLgUp();
  const activationNudgeUi = useReferralActivationVisibility({
    data: activationProgress,
    surface: 'verify_email',
    userId: user?.id,
  });

  const token = searchParams.get('token');

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setStatus('error');
      setErrorMessage(t('invalidVerificationLink'));
      return;
    }

    verifyEmail(token)
      .then(async () => {
        if (isAuthenticated) {
          const [profileResult, progressResult] = await Promise.allSettled([
            getProfile(),
            get<ReferralActivationProgressData>('/referral/my-activation'),
          ]);

          if (!cancelled && profileResult.status === 'fulfilled') {
            updateUser(profileResult.value);
          }

          if (!cancelled && progressResult.status === 'fulfilled') {
            setActivationProgress(progressResult.value);
          }
        }

        if (cancelled) return;
        setStatus('success');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : t('failedToVerifyEmail'));
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token, t, updateUser]);

  if (status === 'loading') {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-muted">{t('verifyingEmail')}</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background py-12 px-4">
        <div className="max-w-md w-full space-y-4">
          <Result
            status="success"
            title={t('emailVerified')}
            subTitle={t('emailVerifiedDesc')}
            extra={
              <Link href={activationProgress?.isReferred ? '/products' : '/'}>
                <Button variant="primary">
                  {activationProgress?.isReferred ? t('goToHome') : t('goToHome')}
                </Button>
              </Link>
            }
          />
          {activationProgress?.isReferred &&
            ['in_progress', 'rejected'].includes(activationProgress.status) &&
            !activationNudgeUi.dismissed && (
            lgUp ? (
              <ReferralActivationNudge
                data={activationProgress}
                surface="verify_email"
                onDismiss={activationNudgeUi.dismiss}
              />
            ) : (
              <MobileReferralProgressBanner
                data={activationProgress}
                surface="verify_email"
                onDismiss={activationNudgeUi.dismiss}
              />
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background py-12 px-4">
      <div className="max-w-md w-full">
        <Result
          status="error"
          title={t('verificationFailed')}
          subTitle={errorMessage || t('verificationFailedDesc')}
          extra={
            <Link href="/login">
              <Button variant="primary">{t('goToSignIn')}</Button>
            </Link>
          }
        />
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
