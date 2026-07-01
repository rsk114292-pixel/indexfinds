import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { headers } from 'next/headers';
import { ReactNode } from 'react';

type AuthLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

const AUTH_ROBOTS = {
  index: false,
  follow: true,
  googleBot: {
    index: false,
    follow: true,
  },
} as const;

export async function generateMetadata({
  params,
}: AuthLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || `/${locale}/login`;
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/login';

  const titleByPath: Record<string, string> = {
    '/login': t('signIn'),
    '/register': t('createAccount'),
    '/forgot-password': t('forgotYourPassword'),
    '/reset-password': t('resetPassword'),
    '/verify-email': t('verifyingEmail'),
  };
  const title = titleByPath[pathWithoutLocale];

  return {
    ...(title ? { title } : {}),
    robots: AUTH_ROBOTS,
  };
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return <>{children}</>;
}
