'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { locales, type Locale } from '@/i18n/config';
import { buildLocaleSwitchHref, getCurrentHash } from '@/i18n/locale-switch';
import {
  useCurrencyStore,
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
} from '@/stores/useCurrencyStore';
import { MobileSheet } from './ui/MobileSheet';
import { Check } from 'lucide-react';

interface MobileSettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

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

export default function MobileSettingsSheet({
  open,
  onClose,
}: MobileSettingsSheetProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currency, setCurrency } = useCurrencyStore();
  const t = useTranslations('header');
  const tc = useTranslations('currency');

  const handleLanguageChange = (newLocale: Locale) => {
    if (newLocale === locale) return;
    router.replace(
      buildLocaleSwitchHref(pathname, searchParams, getCurrentHash()),
      { locale: newLocale },
    );
    onClose();
  };

  const handleCurrencyChange = (code: CurrencyCode) => {
    if (code === currency) return;
    setCurrency(code);
    onClose();
  };

  return (
    <MobileSheet open={open} onClose={onClose} title={t('settings')}>
      <div className="pb-4 space-y-5">
        {/* Language Section */}
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            {t('language')}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {locales.map((l) => {
              const isActive = l === locale;
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => handleLanguageChange(l)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'bg-gray-50 text-foreground active:bg-gray-100'
                  }`}
                >
                  <span>{LANGUAGE_LABELS[l]}</span>
                  {isActive && <Check className="w-4 h-4" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Currency Section */}
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            {tc('label')}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {SUPPORTED_CURRENCIES.map((code) => {
              const isActive = code === currency;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleCurrencyChange(code)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'bg-gray-50 text-foreground active:bg-gray-100'
                  }`}
                >
                  <span>{tc(code)}</span>
                  {isActive && <Check className="w-4 h-4" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </MobileSheet>
  );
}
