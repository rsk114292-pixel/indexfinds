'use client';

import { useTranslations } from 'next-intl';
import { useCurrencyStore } from '@/stores/useCurrencyStore';

export default function CurrencyDisclaimer() {
  const t = useTranslations('currency');
  const { currency } = useCurrencyStore();

  if (currency === 'CNY') return null;

  return (
    <p className="text-xs text-white/60">
      {t('approximateNotice', { currency })}
    </p>
  );
}
