'use client';

import { Suspense, useEffect, useState, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { App } from 'antd';
import { Spinner } from '@/components/ui/Spinner';
import { Result } from '@/components/ui/Result';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/useAuthStore';
import { associateVisitWithUser } from '@/lib/visit-tracking';
import { post } from '@/lib/api';
import { getProfile } from '@/lib/auth-api';
import { consumeAuthRedirect } from '@/lib/auth-redirect';
import {
  getOAuthCallbackErrorMessage,
  type OAuthCallbackTranslations,
} from './oauth-error';

// Lightweight i18n for OAuth callback page (outside [locale])
type OAuthCallbackPageTranslations = OAuthCallbackTranslations & {
  completingLogin: string;
  loginFailed: string;
  backToLogin: string;
  loginSuccessful: string;
  redirecting: string;
  loading: string;
  loginSuccess: string;
  noAuthCode: string;
  tokenExchangeFailed: string;
};

const translations: Record<string, OAuthCallbackPageTranslations> = {
  en: {
    completingLogin: 'Completing login...',
    loginFailed: 'Login Failed',
    backToLogin: 'Back to Login',
    loginSuccessful: 'Login Successful',
    redirecting: 'Redirecting to home page...',
    loading: 'Loading...',
    loginSuccess: 'Login successful!',
    noAuthCode: 'No authorization code received',
    tokenExchangeFailed: 'Failed to exchange code for token',
    loginCompleteFailed: 'Failed to complete login',
    userCancelled: 'Login was cancelled',
    providerError: 'The login provider encountered an error. Please try again.',
    providerTimeout:
      'The login provider took too long to respond. Please try again.',
    invalidState: 'Login session expired or invalid. Please try again.',
  },
  zh: {
    completingLogin: '正在完成登录...',
    loginFailed: '登录失败',
    backToLogin: '返回登录',
    loginSuccessful: '登录成功',
    redirecting: '正在跳转到首页...',
    loading: '加载中...',
    loginSuccess: '登录成功！',
    noAuthCode: '未收到授权码',
    tokenExchangeFailed: '无法交换授权令牌',
    loginCompleteFailed: '登录失败',
    userCancelled: '登录已取消',
    providerError: '登录服务遇到问题，请重试。',
    providerTimeout: '登录服务响应超时，请重试。',
    invalidState: '登录会话已过期或无效，请重试。',
  },
};

function getLocaleFromCookie(): string {
  if (typeof document === 'undefined') return 'en';
  const match = document.cookie.match(/NEXT_LOCALE=(\w+)/);
  return match?.[1] === 'zh' ? 'zh' : 'en';
}

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const processedRef = useRef(false);

  const t = useMemo(() => {
    const locale = getLocaleFromCookie();
    return translations[locale] || translations.en;
  }, []);

  useEffect(() => {
    if (processedRef.current) return;

    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setErrorMessage(
          getOAuthCallbackErrorMessage(error, t) || t.loginCompleteFailed,
        );
        return;
      }

      if (!code) {
        setStatus('error');
        setErrorMessage(t.noAuthCode);
        return;
      }

      processedRef.current = true;
      // 立即清除 URL 中的 code 参数，防止浏览器历史/Referer 泄漏
      window.history.replaceState({}, '', window.location.pathname);

      try {
        const tokenData = await post<{ accessToken: string }>('/auth/exchange', { code });
        const accessToken = tokenData.accessToken;

        if (!accessToken) {
          setStatus('error');
          setErrorMessage(t.tokenExchangeFailed);
          return;
        }

        useAuthStore.getState().setToken(accessToken);

        const user = await getProfile();

        setAuth(user, accessToken);
        associateVisitWithUser();
        setStatus('success');
        message.success(t.loginSuccess);

        const redirectPath = consumeAuthRedirect('/');
        setTimeout(() => {
          router.replace(redirectPath);
        }, 1000);
      } catch (err: unknown) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : t.loginCompleteFailed);
      }
    };

    handleCallback();
  }, [searchParams, setAuth, router, message, t]);

  if (status === 'loading') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-background">
        <Spinner size="lg" />
        <p className="mt-4 text-muted">{t.completingLogin}</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <Result
          status="error"
          title={t.loginFailed}
          subTitle={errorMessage}
          extra={
            <Button variant="primary" onClick={() => router.push('/login')}>
              {t.backToLogin}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background">
      <Result
        status="success"
        title={t.loginSuccessful}
        subTitle={t.redirecting}
      />
    </div>
  );
}

export default function OAuthCallbackPage() {
  const t = useMemo(() => {
    const locale = getLocaleFromCookie();
    return translations[locale] || translations.en;
  }, []);

  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex flex-col items-center justify-center bg-background">
          <Spinner size="lg" />
          <p className="mt-4 text-muted">{t.loading}</p>
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
