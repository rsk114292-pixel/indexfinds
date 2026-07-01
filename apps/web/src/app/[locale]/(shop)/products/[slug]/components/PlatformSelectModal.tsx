'use client';

import { useState, useEffect } from 'react';
import { Modal } from 'antd';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Empty } from '@/components/ui/Empty';
import PlatformLogoBadge from '@/components/platforms/PlatformLogoBadge';
import {
  usePlatformStore,
  getLocalizedPlatformName,
  getLocalizedPlatformDescription,
} from '@/stores/usePlatformStore';

// Re-export store helpers for backward compatibility
export {
  getSavedPlatform,
  savePlatformPreference,
  clearPlatformPreference,
} from '@/stores/usePlatformStore';

interface PlatformSelectModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (platformKey: string) => void;
}

export default function PlatformSelectModal({
  open,
  onClose,
  onSelect,
}: PlatformSelectModalProps) {
  const { platforms, platformKey, fetchPlatforms } = usePlatformStore();
  const [loadingPlatforms, setLoadingPlatforms] = useState(false);
  const [loadingPlatform, setLoadingPlatform] = useState<string | null>(null);
  const locale = useLocale();
  const t = useTranslations('buy');

  // Fetch platforms when modal opens
  useEffect(() => {
    if (open) {
      setLoadingPlatform(null);
      if (platforms.length > 0) return;
      setLoadingPlatforms(true);
      fetchPlatforms().finally(() => setLoadingPlatforms(false));
    }
  }, [open, platforms.length, fetchPlatforms]);

  // One-click: select platform and immediately redirect
  const handleClick = (key: string) => {
    if (loadingPlatform) return; // prevent double-click
    setLoadingPlatform(key);
    onSelect(key);
  };

  const preferredPlatform = platformKey
    ? platforms.find((p) => p.key === platformKey)
    : undefined;

  return (
    <Modal
      title={t('selectPlatform')}
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      centered
      destroyOnHidden
    >
      {loadingPlatforms ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : platforms.length === 0 ? (
        <Empty description={t('noPlatforms')} />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {platforms.map((platform) => {
              const localizedName = getLocalizedPlatformName(platform, locale);
              const localizedDescription = getLocalizedPlatformDescription(platform, locale);
              const isPreferred = platformKey === platform.key;
              const isLoading = loadingPlatform === platform.key;
              const isDisabled = !!loadingPlatform && !isLoading;

              return (
                <button
                  key={platform.id}
                  onClick={() => handleClick(platform.key)}
                  disabled={isDisabled}
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg transition-all cursor-pointer ${
                    isPreferred
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30 hover:bg-gray-50'
                  } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {/* Logo */}
                  <div className="relative w-12 h-12 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                    <PlatformLogoBadge
                      platformKey={platform.key}
                      name={localizedName}
                      logoUrl={platform.logoUrl}
                      className="flex w-full h-full items-center justify-center rounded-lg"
                      imageClassName="w-full h-full object-contain p-1"
                      labelClassName="text-sm font-semibold tracking-[0.04em]"
                    />
                  </div>

                  {/* Name & description */}
                  <div className="flex-1 min-w-0 text-left rtl:text-right">
                    <div className={`font-medium truncate ${
                      isPreferred ? 'text-primary' : 'text-foreground'
                    }`}>
                      {localizedName}
                    </div>
                    {localizedDescription && (
                      <div className="text-xs text-muted truncate">
                        {localizedDescription}
                      </div>
                    )}
                  </div>

                  {/* Loading spinner or preferred indicator */}
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                  ) : isPreferred ? (
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Quick-action button for preferred platform */}
          {platformKey && preferredPlatform && (
            <div className="pt-2 border-t border-border">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => handleClick(platformKey)}
                loading={loadingPlatform === platformKey}
                disabled={!!loadingPlatform && loadingPlatform !== platformKey}
              >
                {t('continueTo', {
                  platform: getLocalizedPlatformName(preferredPlatform, locale) || t('platformFallback'),
                })}
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
