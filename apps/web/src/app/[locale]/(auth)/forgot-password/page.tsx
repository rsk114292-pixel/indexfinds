'use client';

import { useState, type FormEvent } from 'react';
import { Link } from '@/i18n/navigation';
import { App } from 'antd';
import { Mail } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Result } from '@/components/ui/Result';
import { forgotPassword } from '@/lib/auth-api';
import { useTranslations } from 'next-intl';
import { isValidEmail } from '@/lib/validators';

export default function ForgotPasswordPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ email?: string }>({});
  const t = useTranslations('auth');

  const validate = () => {
    const newErrors: { email?: string } = {};
    if (!email) newErrors.email = t('validation.emailRequired');
    else if (!isValidEmail(email)) newErrors.email = t('validation.emailInvalid');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : t('failedToSendResetEmail'));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background py-12 px-4">
        <div className="max-w-md w-full">
          <Result
            status="success"
            title={t('checkYourEmail')}
            subTitle={t('checkYourEmailDesc')}
            extra={
              <Link href="/login">
                <Button variant="primary">{t('backToSignIn')}</Button>
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background py-12 px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground">
            {t('forgotYourPassword')}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {t('forgotPasswordDesc')}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            type="email"
            placeholder={t('emailOnlyPlaceholder')}
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrors({}); }}
            icon={<Mail className="w-4 h-4" />}
            error={errors.email}
            size="lg"
          />

          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
            {t('sendResetLink')}
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
