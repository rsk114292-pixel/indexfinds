'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { locales, type Locale } from '@/i18n/config';
import { buildLocaleSwitchHref, getCurrentHash } from '@/i18n/locale-switch';
import { Dropdown } from 'antd';
import { Globe } from 'lucide-react';

const LANGUAGE_LABELS: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  ar: 'العربية',
};

export default function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('header');

  const menu = {
    items: locales.map((l) => ({
      key: l,
      label: LANGUAGE_LABELS[l],
      disabled: l === locale,
    })),
    onClick: ({ key }: { key: string }) => {
      router.replace(
        buildLocaleSwitchHref(pathname, searchParams, getCurrentHash()),
        { locale: key as Locale },
      );
    },
  };

  return (
    <Dropdown menu={menu} placement="bottomRight">
      <button
        type="button"
        className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white rounded-lg transition-colors duration-200 cursor-pointer"
        aria-label={t('switchLanguage')}
      >
        <Globe className="w-5 h-5" />
      </button>
    </Dropdown>
  );
}
