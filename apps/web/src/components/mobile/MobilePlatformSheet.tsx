'use client';

import { useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { MobileSheet } from './ui/MobileSheet';
import PlatformLogoBadge from '@/components/platforms/PlatformLogoBadge';
import {
  usePlatformStore,
  type Platform,
  getLocalizedPlatformName,
} from '@/stores/usePlatformStore';

interface MobilePlatformSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function MobilePlatformSheet({
  open,
  onClose,
}: MobilePlatformSheetProps) {
  const { platforms, platformKey, setPlatform, fetchPlatforms } =
    usePlatformStore();
  const locale = useLocale();
  const t = useTranslations('header');

  // Refresh platforms when sheet opens
  useEffect(() => {
    if (open && platforms.length === 0) {
      fetchPlatforms();
    }
  }, [open, platforms.length, fetchPlatforms]);

  const handleSelect = (platform: Platform) => {
    setPlatform(platform.key);
    onClose();
  };

  return (
    <MobileSheet open={open} onClose={onClose} title={t('platformSelect')}>
      <div className="grid grid-cols-2 gap-3 pb-4">
        {platforms.map((platform) => {
          const localizedName = getLocalizedPlatformName(platform, locale);
          const isSelected = platformKey === platform.key;
          return (
            <button
              key={platform.id}
              type="button"
              onClick={() => handleSelect(platform)}
              className={`flex items-center gap-2.5 p-3 border-2 rounded-xl transition-all cursor-pointer ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border active:bg-gray-50'
              }`}
            >
              {/* Logo */}
              <div className="relative w-9 h-9 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                <PlatformLogoBadge
                  platformKey={platform.key}
                  name={localizedName}
                  logoUrl={platform.logoUrl}
                  className="flex w-full h-full items-center justify-center rounded-lg"
                  imageClassName="w-full h-full object-contain p-0.5"
                  labelClassName="text-[11px] font-semibold tracking-[0.04em]"
                />
              </div>

              {/* Name */}
              <span
                className={`flex-1 text-sm font-medium truncate text-left rtl:text-right ${
                  isSelected ? 'text-primary' : 'text-foreground'
                }`}
              >
                {localizedName}
              </span>

              {/* Checkmark */}
              {isSelected && (
                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {platforms.length === 0 && (
        <div className="py-8 text-center text-sm text-muted">
          {t('noPlatformSelected')}
        </div>
      )}
    </MobileSheet>
  );
}
