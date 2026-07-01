'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Dropdown } from 'antd';
import { Store } from 'lucide-react';
import PlatformLogoBadge from '@/components/platforms/PlatformLogoBadge';
import {
  usePlatformStore,
  useCurrentPlatform,
  getLocalizedPlatformName,
} from '@/stores/usePlatformStore';

export default function PlatformSelector() {
  const { platforms, platformKey, setPlatform } = usePlatformStore();
  const currentPlatform = useCurrentPlatform();
  const locale = useLocale();
  const t = useTranslations('header');

  const menu = {
    items: platforms.map((p) => ({
      key: p.key,
      label: getLocalizedPlatformName(p, locale),
      icon: p.logoUrl ? (
        <PlatformLogoBadge
          platformKey={p.key}
          name={getLocalizedPlatformName(p, locale)}
          logoUrl={p.logoUrl}
          className="flex w-5 h-5 items-center justify-center rounded"
          imageClassName="w-5 h-5 object-contain rounded"
          labelClassName="text-[9px] font-semibold"
        />
      ) : undefined,
      disabled: p.key === platformKey,
    })),
    onClick: ({ key }: { key: string }) => {
      setPlatform(key);
    },
  };

  return (
    <Dropdown menu={menu} placement="bottomRight">
      <button
        type="button"
        className="flex items-center gap-1 h-10 px-2 text-white/80 hover:text-white rounded-lg transition-colors duration-200 cursor-pointer"
        aria-label={t('platformSelect')}
      >
        {currentPlatform?.logoUrl ? (
          <PlatformLogoBadge
            platformKey={currentPlatform.key}
            name={getLocalizedPlatformName(currentPlatform, locale)}
            logoUrl={currentPlatform.logoUrl}
            className="flex w-5 h-5 items-center justify-center rounded"
            imageClassName="w-5 h-5 object-contain rounded"
            labelClassName="text-[9px] font-semibold"
          />
        ) : (
          <Store className="w-5 h-5" />
        )}
        <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </Dropdown>
  );
}
