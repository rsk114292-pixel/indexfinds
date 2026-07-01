'use client';

import { Check } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter as useI18nRouter, usePathname as useI18nPathname } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { MobileSheet } from '@/components/mobile/ui/MobileSheet';
import { buildLocaleSwitchHref, getCurrentHash } from '@/i18n/locale-switch';
import {
  useCurrencyStore,
  SUPPORTED_CURRENCIES,
} from '@/stores/useCurrencyStore';
import { locales, type Locale } from '@/i18n/config';

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

interface LanguageSheetProps {
  open: boolean;
  onClose: () => void;
}

export function LanguageSheet({ open, onClose }: LanguageSheetProps) {
  const t = useTranslations('account');
  const locale = useLocale() as Locale;
  const i18nRouter = useI18nRouter();
  const i18nPathname = useI18nPathname();
  const searchParams = useSearchParams();

  return (
    <MobileSheet open={open} onClose={onClose} title={t('language')} maxHeight="60vh">
      <div className="pb-4">
        {locales.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => {
              i18nRouter.replace(
                buildLocaleSwitchHref(i18nPathname, searchParams, getCurrentHash()),
                { locale: l },
              );
              onClose();
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
              l === locale ? 'bg-primary/10 text-primary' : 'active:bg-gray-50 text-foreground'
            }`}
          >
            <span className="text-sm">{LANGUAGE_LABELS[l]}</span>
            {l === locale && <Check className="w-4 h-4 text-primary" />}
          </button>
        ))}
      </div>
    </MobileSheet>
  );
}

interface CurrencySheetProps {
  open: boolean;
  onClose: () => void;
}

export function CurrencySheet({ open, onClose }: CurrencySheetProps) {
  const tCurrency = useTranslations('currency');
  const { currency, setCurrency } = useCurrencyStore();

  return (
    <MobileSheet open={open} onClose={onClose} title={tCurrency('label')} maxHeight="60vh">
      <div className="pb-4">
        {SUPPORTED_CURRENCIES.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => {
              setCurrency(code);
              onClose();
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
              code === currency ? 'bg-primary/10 text-primary' : 'active:bg-gray-50 text-foreground'
            }`}
          >
            <span className="text-sm">{tCurrency(code)}</span>
            {code === currency && <Check className="w-4 h-4 text-primary" />}
          </button>
        ))}
      </div>
    </MobileSheet>
  );
}

export { LANGUAGE_LABELS };
