'use client';

import { useState, Suspense, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { App } from 'antd';
import { Lock } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Result } from '@/components/ui/Result';
import { Spinner } from '@/components/ui/Spinner';
import { resetPassword } from '@/lib/auth-api';
import { useTranslations } from 'next-intl';
import { validatePassword } from '@/lib/validators';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const t = useTranslations('auth');

  const token = searchParams.get('token');

  if (!token) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background py-12 px-4">
        <div className="max-w-md w-full">
          <Result
            status="error"
            title={t('invalidResetLink')}
            subTitle={t('invalidResetLinkDesc')}
            extra={
              <Link href="/forgot-password">
                <Button variant="primary">{t('requestNewLink')}</Button>
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background py-12 px-4">
        <div className="max-w-md w-full">
          <Result
            status="success"
            title={t('passwordResetSuccess')}
            subTitle={t('passwordResetSuccessDesc')}
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

  const validate = () => {
    const e: { newPassword?: string; confirmPassword?: string } = {};
    if (!newPassword) {
      e.newPassword = t('validation.newPasswordRequired');
    } else {
      const pwErr = validatePassword(newPassword);
      if (pwErr) e.newPassword = t(pwErr);
    }
    if (!confirmPassword) {
      e.confirmPassword = t('validation.confirmPasswordRequired');
    } else if (newPassword !== confirmPassword) {
      e.confirmPassword = t('validation.passwordsNotMatch');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : t('failedToResetPassword'));
    } finally {
      setLoading(false);
    }
  };

  const clearError = (field: 'newPassword' | 'confirmPassword') => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background py-12 px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground">
            {t('setNewPassword')}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {t('setNewPasswordDesc')}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            type="password"
            placeholder={t('newPasswordPlaceholder')}
            value={newPassword}
            onChange={(e) => { setNewPassword(e.target.value); clearError('newPassword'); }}
            icon={<Lock className="w-4 h-4" />}
            error={errors.newPassword}
            size="lg"
          />

          <Input
            type="password"
            placeholder={t('confirmNewPasswordPlaceholder')}
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); clearError('confirmPassword'); }}
            icon={<Lock className="w-4 h-4" />}
            error={errors.confirmPassword}
            size="lg"
          />

          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
            {t('resetPassword')}
          </Button>
        </form>

        <div className="text-center mt-6">
          <Link href="/login" className="text-sm text-primary hover:text-primary-hover">
            {t('backToSignIn')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
