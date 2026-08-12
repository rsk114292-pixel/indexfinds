'use client';

import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter, Link } from '@/i18n/navigation';
import { App } from 'antd';
import { Mail, Lock, ChevronLeft } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { login } from '@/lib/auth-api';
import { useAuthStore } from '@/stores/useAuthStore';
import { associateVisitWithUser } from '@/lib/visit-tracking';
import { APP_NAME, API_BASE_URL } from '@/lib/constants';
import { useTranslations } from 'next-intl';
import { isValidEmail } from '@/lib/validators';
import { GoogleIcon } from '@/components/icons/OAuthIcons';
import {
  clearPersistedAuthRedirect,
  getSafeRedirectPath,
  persistAuthRedirect,
} from '@/lib/auth-redirect';


/**
 * 移动端登录页
 *
 * 设计规格（Plan 6.9）：
 * - 自包含页面（不在 shop layout 内，无 MobileHeader / MobileTabBar）
 * - 简洁全屏表单式，Logo + 表单 + 第三方登录
 * - 输入框 48px 高度，方便手指点击
 * - 键盘弹出时自动推页面，防遮挡
 */
export default function MobileLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const requestedRedirect = getSafeRedirectPath(searchParams.get('redirect'), '');
  const redirectPath = requestedRedirect || '/';
  const registerHref = requestedRedirect
    ? `/register?redirect=${encodeURIComponent(requestedRedirect)}`
    : '/register';

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
        <div className="mt-4 mb-8">
          <Link href="/" className="text-xl font-bold text-primary">
            {APP_NAME}
          </Link>
          <h1 className="text-2xl font-bold text-foreground mt-4">
            {t('welcomeBack')}
          </h1>
          <p className="text-sm text-muted mt-1.5">
            {t('noAccount')}{' '}
            <Link href={registerHref} className="font-medium text-primary">
              {t('signUpFree')}
            </Link>
          </p>
        </div>

        {/* 第三方登录 */}
        <div className="space-y-3 mb-6">
          <button
            type="button"
            onClick={() => {
              persistAuthRedirect(redirectPath, '/');
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
              {t('orContinueWithEmail')}
            </span>
          </div>
        </div>

        {/* 邮箱登录表单 */}
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
            <Link href="/forgot-password" className="text-sm text-primary active:opacity-70 transition-opacity">
              {t('forgotPassword')}
            </Link>
          </div>

          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full !h-12 !rounded-xl">
            {t('signIn')}
          </Button>
        </form>

        {/* 底部版权 */}
        <p className="mt-10 text-center text-xs text-muted">
          &copy; {new Date().getFullYear()} {APP_NAME}
        </p>
      </div>
    </div>
  );
}
