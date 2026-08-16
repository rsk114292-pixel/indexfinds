"use client";

import { useState } from "react";
import { ChevronDown, CircleDollarSign, Globe2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { locales, type Locale } from "@/i18n/config";
import {
  buildLocaleSwitchHref,
  getCurrentHash,
} from "@/i18n/locale-switch";
import {
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
  useCurrencyStore,
} from "@/stores/useCurrencyStore";
import Popover from "@/components/ui/Popover";

const LANGUAGE_LABELS: Record<Locale, string> = {
  en: "English",
  zh: "中文",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  ar: "العربية",
};

const LANGUAGE_SHORT_LABELS: Record<Locale, string> = {
  en: "EN",
  zh: "中文",
  fr: "FR",
  de: "DE",
  es: "ES",
  it: "IT",
  pt: "PT",
  ar: "AR",
};

function HeaderLanguageMenu() {
  const [open, setOpen] = useState(false);
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("header");

  const selectLocale = (nextLocale: Locale) => {
    setOpen(false);
    router.replace(
      buildLocaleSwitchHref(pathname, searchParams, getCurrentHash()),
      { locale: nextLocale },
    );
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      panelRole="menu"
      panelClassName="w-52 p-2"
      trigger={({ controls, expanded, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-controls={controls}
          aria-expanded={expanded}
          className="inline-flex h-10 min-w-[76px] items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 text-white/78 transition-colors hover:border-white/[0.13] hover:bg-white/[0.075] hover:text-white"
          aria-label={`${t("language")}: ${LANGUAGE_LABELS[locale]}`}
        >
          <Globe2 className="h-4 w-4" />
          <span className="text-xs font-bold tracking-[0.08em]">
            {LANGUAGE_SHORT_LABELS[locale]}
          </span>
          <ChevronDown className="h-3 w-3 text-white/45" />
        </button>
      )}
    >
      <div className="px-2 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.14em] text-muted">
        {t("language")}
      </div>
      <div className="grid gap-1">
        {locales.map((code) => (
          <button
            key={code}
            type="button"
            role="menuitemradio"
            aria-checked={code === locale}
            onClick={() => selectLocale(code)}
            className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              code === locale
                ? "bg-primary/10 font-semibold text-primary"
                : "hover:bg-gray-50"
            }`}
          >
            {LANGUAGE_LABELS[code]}
          </button>
        ))}
      </div>
    </Popover>
  );
}

function HeaderCurrencyMenu() {
  const [open, setOpen] = useState(false);
  const { currency, setCurrency } = useCurrencyStore();
  const tc = useTranslations("currency");

  const selectCurrency = (nextCurrency: CurrencyCode) => {
    setCurrency(nextCurrency);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      panelRole="menu"
      panelClassName="w-48 p-2"
      trigger={({ controls, expanded, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-controls={controls}
          aria-expanded={expanded}
          className="inline-flex h-10 min-w-[88px] items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 text-white/78 transition-colors hover:border-white/[0.13] hover:bg-white/[0.075] hover:text-white"
          aria-label={`${tc("label")}: ${currency}`}
        >
          <CircleDollarSign className="h-4 w-4" />
          <span className="text-xs font-bold tracking-[0.05em]">
            {currency}
          </span>
          <ChevronDown className="h-3 w-3 text-white/45" />
        </button>
      )}
    >
      <div className="px-2 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.14em] text-muted">
        {tc("label")}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {SUPPORTED_CURRENCIES.map((code) => (
          <button
            key={code}
            type="button"
            role="menuitemradio"
            aria-checked={code === currency}
            onClick={() => selectCurrency(code)}
            className={`rounded-lg px-2 py-2 text-center text-xs font-semibold transition-colors ${
              code === currency
                ? "bg-primary/10 text-primary"
                : "hover:bg-gray-50"
            }`}
          >
            {code}
          </button>
        ))}
      </div>
    </Popover>
  );
}

export default function HeaderSettingsMenu() {
  return (
    <div className="hidden items-center gap-2 lg:flex">
      <HeaderLanguageMenu />
      <HeaderCurrencyMenu />
    </div>
  );
}
