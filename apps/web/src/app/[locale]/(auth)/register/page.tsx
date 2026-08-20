'use client';

/**
 * 注册页
 *
 * CSS 双 div 分发（模式 B）：
 * - PC 端：hidden lg:block → 原有左右分栏设计
 * - 移动端：lg:hidden → MobileRegister 全屏表单
 */

import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter, Link } from '@/i18n/navigation';
import { App } from 'antd';
import { Mail, Lock, User, ArrowRight, Package, Store, BadgeCheck } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { register } from '@/lib/auth-api';
import { useAuthStore } from '@/stores/useAuthStore';
import { associateVisitWithUser } from '@/lib/visit-tracking';
import { APP_NAME, API_BASE_URL } from '@/lib/constants';
import { useTranslations } from 'next-intl';
import { isValidEmail, validatePassword } from '@/lib/validators';
import {
  clearPersistedAuthRedirect,
  getSafeRedirectPath,
  persistAuthRedirect,
} from '@/lib/auth-redirect';
import MobileRegister from '../components/mobile/MobileRegister';
import { PUBLIC_GOOGLE_AUTH_ENABLED } from '@/lib/features';

const DEFAULT_REGISTER_REDIRECT = '/account?onboarding=welcome';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

interface FormErrors {
  email?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const t = useTranslations('auth');
  const requestedRedirect = getSafeRedirectPath(searchParams.get('redirect'), '');
  const redirectPath = requestedRedirect || DEFAULT_REGISTER_REDIRECT;
  const loginHref = requestedRedirect
    ? `/login?redirect=${encodeURIComponent(requestedRedirect)}`
    : '/login';

  const stats = [
    { icon: Package, value: '10K+', label: t('register.statsProducts') },
    { icon: Store, value: '500+', label: t('register.statsBrands') },
    { icon: BadgeCheck, value: '100%', label: t('register.statsVerified') },
  ];

  const validate = () => {
    const e: FormErrors = {};
    if (!email) e.email = t('validation.emailRequired');
    else if (!isValidEmail(email)) e.email = t('validation.emailInvalid');
    if (username && username.length > 30) e.username = t('validation.usernameMaxLength');
    if (!password) e.password = t('validation.passwordRequired');
    else { const pwErr = validatePassword(password); if (pwErr) e.password = t(pwErr); }
    if (!confirmPassword) e.confirmPassword = t('validation.confirmPasswordRequired');
    else if (password !== confirmPassword) e.confirmPassword = t('validation.passwordsNotMatch');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const clearError = (field: keyof FormErrors) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const { user, accessToken } = await register({ email, password, username: username || undefined });
      setAuth(user, accessToken);
      associateVisitWithUser();
      clearPersistedAuthRedirect();
      message.success(t('registrationSuccess'));
      router.replace(redirectPath);
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : t('registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── PC 端视图 ── */}
      <div className="hidden lg:block">
        <div className="min-h-dvh flex">
          {/* Left Panel - Branding */}
          <div className="lg:flex lg:w-[480px] xl:w-[560px] relative overflow-hidden flex-col justify-between p-10 xl:p-14 shrink-0">
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(135deg, #1A1A2E 0%, #2D2B55 50%, #FF6B47 100%)',
              }}
            />
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage: `radial-gradient(circle at 25% 25%, white 1px, transparent 1px),
                                  radial-gradient(circle at 75% 75%, white 1px, transparent 1px)`,
                backgroundSize: '40px 40px',
              }}
            />

            <div className="relative z-10">
              <Link href="/" className="inline-flex items-center gap-2 text-white font-bold text-xl hover:opacity-90 transition-opacity">
                {APP_NAME}
              </Link>
            </div>

            <div className="relative z-10 space-y-8">
              <div>
                <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight whitespace-pre-line">
                  {t('register.heroTitle')}
                </h1>
                <p className="mt-3 text-white/75 text-base leading-relaxed max-w-sm">
                  {t('register.heroDesc')}
                </p>
              </div>

              <div className="flex gap-6">
                {stats.map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-2">
                      <s.icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-white font-bold text-xl leading-none">{s.value}</p>
                    <p className="text-white/60 text-xs mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
                <p className="text-white/90 text-sm leading-relaxed italic">
                  &ldquo;{t('register.testimonial')}&rdquo;
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-semibold">
                    A
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium leading-none">Alex K.</p>
                    <p className="text-white/50 text-xs mt-0.5">{t('register.verifiedBuyer')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10">
              <p className="text-white/50 text-xs">
                &copy; {new Date().getFullYear()} {APP_NAME}. {t('features.allRightsReserved')}
              </p>
            </div>
          </div>

          {/* Right Panel - Register Form */}
          <div className="flex-1 flex items-center justify-center px-5 py-10 sm:px-8 bg-background">
            <div className="w-full max-w-[420px]">
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                  {t('createYourAccount')}
                </h2>
                <p className="mt-2 text-sm text-muted">
                  {t('alreadyHaveAccount')}{' '}
                  <Link href={loginHref} className="font-medium text-primary hover:text-primary-hover transition-colors">
                    {t('signInLink')} <ArrowRight className="inline w-3.5 h-3.5" />
                  </Link>
                </p>
              </div>

              {PUBLIC_GOOGLE_AUTH_ENABLED ? (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <button
                      type="button"
                      onClick={() => {
                        persistAuthRedirect(redirectPath, DEFAULT_REGISTER_REDIRECT);
                        window.location.href = `${API_BASE_URL}/auth/google`;
                      }}
                      className="h-11 min-h-[44px] flex items-center justify-center gap-2.5 rounded-lg border border-border bg-white text-sm font-medium text-foreground hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                    >
                      <GoogleIcon />
                      <span className="hidden sm:inline">Google</span>
                    </button>
                  </div>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-background px-3 text-muted uppercase tracking-wider">{t('orRegisterWithEmail')}</span>
                    </div>
                  </div>
                </>
              ) : null}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <Input
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
                  icon={<Mail className="w-4 h-4" />}
                  error={errors.email}
                  size="lg"
                />

                <Input
                  type="text"
                  placeholder={t('usernamePlaceholder')}
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); clearError('username'); }}
                  icon={<User className="w-4 h-4" />}
                  error={errors.username}
                  size="lg"
                />

                <Input
                  type="password"
                  placeholder={t('passwordWithLength')}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError('password'); }}
                  icon={<Lock className="w-4 h-4" />}
                  error={errors.password}
                  size="lg"
                />

                <Input
                  type="password"
                  placeholder={t('confirmPasswordPlaceholder')}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); clearError('confirmPassword'); }}
                  icon={<Lock className="w-4 h-4" />}
                  error={errors.confirmPassword}
                  size="lg"
                />

                <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                  {t('createAccount')}
                </Button>

                <p className="text-xs text-muted text-center leading-relaxed">
                  {t('agreeTo')}{' '}
                  <Link href="/terms" className="text-primary hover:text-primary-hover transition-colors">
                    {t('termsOfService')}
                  </Link>
                  {' '}{t('and')}{' '}
                  <Link href="/privacy" className="text-primary hover:text-primary-hover transition-colors">
                    {t('privacyPolicy')}
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* ── 移动端视图 ── */}
      <div className="lg:hidden">
        <MobileRegister />
      </div>
    </>
  );
}
