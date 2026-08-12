'use client';

import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter, Link } from '@/i18n/navigation';
import { App } from 'antd';
import { Mail, Lock, User, ChevronLeft } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { register } from '@/lib/auth-api';
import { useAuthStore } from '@/stores/useAuthStore';
import { associateVisitWithUser } from '@/lib/visit-tracking';
import { APP_NAME, API_BASE_URL } from '@/lib/constants';
import { useTranslations } from 'next-intl';
import { isValidEmail, validatePassword } from '@/lib/validators';
import { GoogleIcon } from '@/components/icons/OAuthIcons';
import {
  clearPersistedAuthRedirect,
  getSafeRedirectPath,
  persistAuthRedirect,
} from '@/lib/auth-redirect';

const DEFAULT_REGISTER_REDIRECT = '/account?onboarding=welcome';

interface FormErrors {
  email?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
}

/**
 * 移动端注册页
 *
 * 设计规格（Plan 6.9）：
 * - 自包含页面（不在 shop layout 内）
 * - 全屏表单式，Logo + 第三方 + 邮箱注册
 * - 输入框 48px 高度
 */
export default function MobileRegister() {
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
  const tc = useTranslations('common');
  const requestedRedirect = getSafeRedirectPath(searchParams.get('redirect'), '');
  const redirectPath = requestedRedirect || DEFAULT_REGISTER_REDIRECT;
  const loginHref = requestedRedirect
    ? `/login?redirect=${encodeURIComponent(requestedRedirect)}`
    : '/login';

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
    <div
      className="min-h-dvh bg-background flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
    >
      {/* 顶部导航栏 */}
      <div className="flex items-center h-12 px-4 shrink-0">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center -ml-1.5 rtl:-mr-1.5 rtl:ml-0 rounded-full active:bg-gray-100 transition-colors"
          aria-label={tc('goBack')}
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* 主内容区 - 可滚动 */}
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        {/* Logo & 标题 */}
        <div className="mt-4 mb-6">
          <Link href="/" className="text-xl font-bold text-primary">
            {APP_NAME}
          </Link>
          <h1 className="text-2xl font-bold text-foreground mt-4">
            {t('createYourAccount')}
          </h1>
          <p className="text-sm text-muted mt-1.5">
            {t('alreadyHaveAccount')}{' '}
            <Link href={loginHref} className="font-medium text-primary">
              {t('signInLink')}
            </Link>
          </p>
        </div>

        {/* 第三方登录 */}
        <div className="space-y-3 mb-6">
          <button
            type="button"
            onClick={() => {
              persistAuthRedirect(redirectPath, DEFAULT_REGISTER_REDIRECT);
              window.location.href = `${API_BASE_URL}/auth/google`;
            }}
            className="w-full h-12 flex items-center justify-center gap-2.5 rounded-xl border border-border bg-white text-sm font-medium text-foreground active:scale-[0.98] transition-all"
          >
            <GoogleIcon />
            <span>Google</span>
          </button>
        </div>

        {/* 分割线 */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-3 text-muted uppercase tracking-wider">
              {t('orRegisterWithEmail')}
            </span>
          </div>
        </div>

        {/* 注册表单 */}
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

          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full !h-12 !rounded-xl">
            {t('createAccount')}
          </Button>

          <p className="text-xs text-muted text-center leading-relaxed">
            {t('agreeTo')}{' '}
            <Link href="/terms" className="text-primary">
              {t('termsOfService')}
            </Link>
            {' '}{t('and')}{' '}
            <Link href="/privacy" className="text-primary">
              {t('privacyPolicy')}
            </Link>
          </p>
        </form>

        {/* 底部版权 */}
        <p className="mt-8 text-center text-xs text-muted">
          &copy; {new Date().getFullYear()} {APP_NAME}
        </p>
      </div>
    </div>
  );
}
