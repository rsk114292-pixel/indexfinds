'use client';

import { useState } from 'react';
import { Settings2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { locales, type Locale } from '@/i18n/config';
import { buildLocaleSwitchHref, getCurrentHash } from '@/i18n/locale-switch';
import {
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
  useCurrencyStore,
} from '@/stores/useCurrencyStore';
import Popover from '@/components/ui/Popover';

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

export default function HeaderSettingsMenu() {
  const [open, setOpen] = useState(false);
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currency, setCurrency } = useCurrencyStore();
  const t = useTranslations('header');
  const tc = useTranslations('currency');

  const selectLocale = (nextLocale: Locale) => {
    setOpen(false);
    router.replace(
      buildLocaleSwitchHref(pathname, searchParams, getCurrentHash()),
      { locale: nextLocale },
    );
  };

  const selectCurrency = (nextCurrency: CurrencyCode) => {
    setCurrency(nextCurrency);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      panelRole="menu"
      panelClassName="w-64 p-3"
      trigger={({ controls, expanded, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-controls={controls}
          aria-expanded={expanded}
          className="flex h-10 items-center gap-1.5 rounded-lg px-2 text-white/75 transition-colors hover:bg-white/[0.06] hover:text-white"
          aria-label={t('settings')}
        >
          <Settings2 className="h-[18px] w-[18px]" />
          <span className="hidden text-xs font-semibold uppercase 2xl:inline">
            {locale} · {currency}
          </span>
        </button>
      )}
    >
      <section>
        <h3 className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
          {t('language')}
        </h3>
        <div className="grid grid-cols-2 gap-1">
          {locales.map((code) => (
            <button
              key={code}
              type="button"
              role="menuitemradio"
              aria-checked={code === locale}
              onClick={() => selectLocale(code)}
              className={`rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                code === locale
                  ? 'bg-primary/10 font-semibold text-primary'
                  : 'hover:bg-gray-50'
              }`}
            >
              {LANGUAGE_LABELS[code]}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-3 border-t border-border pt-3">
        <h3 className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
          {tc('label')}
        </h3>
        <div className="grid grid-cols-3 gap-1">
          {SUPPORTED_CURRENCIES.map((code) => (
            <button
              key={code}
              type="button"
              role="menuitemradio"
              aria-checked={code === currency}
              onClick={() => selectCurrency(code)}
              className={`rounded-lg px-2 py-2 text-center text-xs font-semibold transition-colors ${
                code === currency
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-gray-50'
              }`}
            >
              {code}
            </button>
          ))}
        </div>
      </section>
    </Popover>
  );
}
