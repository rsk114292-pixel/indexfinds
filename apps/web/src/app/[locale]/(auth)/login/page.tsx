'use client';

/**
 * 登录页
 *
 * CSS 双 div 分发（模式 B）：
 * - PC 端：hidden lg:block → 原有左右分栏设计
 * - 移动端：lg:hidden → MobileLogin 全屏表单
 *
 * 注意：此页面在 (auth) 路由组，不包含 shop layout 的 MobileHeader/MobileTabBar
 */

import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter, Link } from '@/i18n/navigation';
import { App } from 'antd';
import { Mail, Lock, Search, TrendingUp, Shield, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { login } from '@/lib/auth-api';
import { useAuthStore } from '@/stores/useAuthStore';
import { associateVisitWithUser } from '@/lib/visit-tracking';
import { APP_NAME, API_BASE_URL } from '@/lib/constants';
import { useTranslations } from 'next-intl';
import { isValidEmail } from '@/lib/validators';
import {
  clearPersistedAuthRedirect,
  getSafeRedirectPath,
  persistAuthRedirect,
} from '@/lib/auth-redirect';
import MobileLogin from '../components/mobile/MobileLogin';


const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const t = useTranslations('auth');
  const requestedRedirect = getSafeRedirectPath(searchParams.get('redirect'), '');
  const redirectPath = requestedRedirect || '/';
  const registerHref = requestedRedirect
    ? `/register?redirect=${encodeURIComponent(requestedRedirect)}`
    : '/register';

  const features = [
    {
      icon: Search,
      title: t('features.smartSearch'),
      desc: t('features.smartSearchDesc'),
    },
    {
      icon: TrendingUp,
      title: t('features.priceTracking'),
      desc: t('features.priceTrackingDesc'),
    },
    {
      icon: Shield,
      title: t('features.trustedSources'),
      desc: t('features.trustedSourcesDesc'),
    },
  ];

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) newErrors.email = t('validation.emailRequired');
    else if (!isValidEmail(email)) newErrors.email = t('validation.emailInvalid');
    if (!password) newErrors.password = t('validation.passwordRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const { user, accessToken } = await login({ email, password });
      setAuth(user, accessToken);
      associateVisitWithUser();
      clearPersistedAuthRedirect();
      message.success(t('loginSuccess'));
      router.replace(redirectPath);
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : t('loginFailed'));
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
            <div className="absolute inset-0 bg-brand-gradient" />
            <div className="absolute inset-0 opacity-10 bg-dot-pattern" />

            <div className="relative z-10">
              <Link href="/" className="inline-flex items-center gap-2 text-white font-bold text-xl hover:opacity-90 transition-opacity">
                {APP_NAME}
              </Link>
            </div>

            <div className="relative z-10 space-y-8">
              <div>
                <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight whitespace-pre-line">
                  {t('features.heroTitle')}
                </h1>
                <p className="mt-3 text-white/80 text-base leading-relaxed max-w-sm">
                  {t('features.heroDesc')}
                </p>
              </div>

              <div className="space-y-4">
                {features.map((f) => (
                  <div key={f.title} className="flex items-start gap-3 group">
                    <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors duration-200">
                      <f.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">{f.title}</h3>
                      <p className="text-white/70 text-sm leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10">
              <p className="text-white/60 text-xs">
                &copy; {new Date().getFullYear()} {APP_NAME}. {t('features.allRightsReserved')}
              </p>
            </div>
          </div>

          {/* Right Panel - Login Form */}
          <div className="flex-1 flex items-center justify-center px-5 py-10 sm:px-8 bg-background">
            <div className="w-full max-w-[420px]">
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                  {t('welcomeBack')}
                </h2>
                <p className="mt-2 text-sm text-muted">
                  {t('noAccount')}{' '}
                  <Link href={registerHref} className="font-medium text-primary hover:text-primary-hover transition-colors">
                    {t('signUpFree')} <ArrowRight className="inline w-3.5 h-3.5" />
                  </Link>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    persistAuthRedirect(redirectPath, '/');
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
                  <span className="bg-background px-3 text-muted uppercase tracking-wider">{t('orContinueWithEmail')}</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <Input
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: undefined })); }}
                  icon={<Mail className="w-4 h-4" />}
                  error={errors.email}
                  size="lg"
                />

                <Input
                  type="password"
                  placeholder={t('passwordPlaceholder')}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: undefined })); }}
                  icon={<Lock className="w-4 h-4" />}
                  error={errors.password}
                  size="lg"
                />

                <div className="flex items-center justify-end">
                  <Link href="/forgot-password" className="text-sm text-primary hover:text-primary-hover transition-colors">
                    {t('forgotPassword')}
                  </Link>
                </div>

                <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                  {t('signIn')}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* ── 移动端视图 ── */}
      <div className="lg:hidden">
        <MobileLogin />
      </div>
    </>
  );
}
