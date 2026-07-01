'use client';

import { useTranslations } from 'next-intl';
import { Dropdown } from 'antd';
import { DollarSign } from 'lucide-react';
import {
  useCurrencyStore,
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
} from '@/stores/useCurrencyStore';

export default function CurrencySelector() {
  const { currency, setCurrency } = useCurrencyStore();
  const t = useTranslations('currency');

  const menu = {
    items: SUPPORTED_CURRENCIES.map((code) => ({
      key: code,
      label: t(code),
      disabled: code === currency,
    })),
    onClick: ({ key }: { key: string }) => {
      setCurrency(key as CurrencyCode);
    },
  };

  return (
    <Dropdown menu={menu} placement="bottomRight">
      <button
        type="button"
        className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white rounded-lg transition-colors duration-200 cursor-pointer"
        aria-label={t('label')}
      >
        <DollarSign className="w-5 h-5" />
      </button>
    </Dropdown>
  );
}
