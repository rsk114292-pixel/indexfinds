import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import AccountLayoutClient from './AccountLayoutClient';

type AccountLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

const ACCOUNT_ROBOTS = {
  index: false,
  follow: true,
  googleBot: {
    index: false,
    follow: true,
  },
} as const;

export async function generateMetadata({
  params,
}: AccountLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'account' });
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || `/${locale}/account`;
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/account';

  const titleByPath: Record<string, string> = {
    '/account': t('overview'),
    '/account/favorites': t('favorites'),
    '/account/history': t('browsingHistory'),
    '/account/referral': t('referralProgram'),
    '/account/security': t('security'),
    '/account/points': t('points'),
    '/account/points/withdraw': t('withdrawPoints'),
    '/account/points/withdrawals': t('withdrawalRecords'),
  };
  const title = titleByPath[pathWithoutLocale];

  return {
    ...(title ? { title } : {}),
    robots: ACCOUNT_ROBOTS,
  };
}

export default function AccountLayout({ children }: AccountLayoutProps) {
  return <AccountLayoutClient>{children}</AccountLayoutClient>;
}
