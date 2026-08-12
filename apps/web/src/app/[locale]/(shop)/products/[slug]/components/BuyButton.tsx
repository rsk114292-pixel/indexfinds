'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Repeat2, ShieldCheck, ShoppingCart } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useBuyProduct } from '@/hooks/useBuyProduct';
import PlatformSelectModal from './PlatformSelectModal';
import PlatformLogoBadge from '@/components/platforms/PlatformLogoBadge';
import { Link } from '@/i18n/navigation';
import {
  getLocalizedPlatformName,
  useCurrentPlatform,
  usePlatformStore,
} from '@/stores/usePlatformStore';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import { convertPrice, formatPrice, cn } from '@/lib/utils';
import { notice } from '@/lib/notice';

interface BuyButtonProps {
  productId: string;
  price: number;
  sourceCurrency: string;
  disabled?: boolean;
  className?: string;
  onBuySuccess?: () => void;
}

export default function BuyButton({
  productId,
  price,
  sourceCurrency,
  disabled,
  className,
  onBuySuccess,
}: BuyButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const t = useTranslations('buy');
  const locale = useLocale();
  const currentPlatform = useCurrentPlatform();
  const { platforms, fetchPlatforms } = usePlatformStore();
  const { currency: displayCurrency, rates } = useCurrencyStore();

  useEffect(() => {
    if (platforms.length === 0) void fetchPlatforms();
  }, [fetchPlatforms, platforms.length]);

  const displayPrice = useMemo(() => {
    const converted = convertPrice(price, sourceCurrency, displayCurrency, rates);
    return `${displayCurrency !== sourceCurrency ? '≈ ' : ''}${formatPrice(converted, displayCurrency)}`;
  }, [displayCurrency, price, rates, sourceCurrency]);

  const { buyWithPlatform, loading } = useBuyProduct({
    productId,
    buttonVariant: 'desktop_buy_button',
    onError: () => notice.error(t('failedToGetLink')),
    onSuccess: onBuySuccess,
  });

  const handlePlatformSelect = async (platformKey: string) => {
    await buyWithPlatform(platformKey);
    setModalOpen(false);
  };

  const preferredName = currentPlatform
    ? getLocalizedPlatformName(currentPlatform, locale)
    : '';

  return (
    <>
      <div
        className={cn(
          'w-full rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 via-white to-brand-indigo/5 p-5 shadow-sm',
          className,
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
              {t('purchaseOptions')}
            </p>
            <p className="mt-1 text-2xl font-extrabold text-foreground">{displayPrice}</p>
            <p className="mt-1 text-xs text-muted">{t('productPrice')}</p>
          </div>
          <Link
            href="/agents/compare"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white! px-3 py-1.5 text-xs font-semibold text-foreground! hover:border-primary/30"
          >
            {t('compareAgents')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-white/80 p-3">
          {currentPlatform ? (
            <PlatformLogoBadge
              platformKey={currentPlatform.key}
              name={preferredName}
              logoUrl={currentPlatform.logoUrl}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              imageClassName="h-11 w-11 rounded-xl object-contain"
              labelClassName="text-[10px] font-bold"
            />
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-muted">
              <ShoppingCart className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-muted">{t('preferredAgent')}</p>
            <p className="truncate text-sm font-bold text-foreground">
              {currentPlatform ? preferredName : t('chooseAgent')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-primary hover:bg-primary/5"
          >
            <Repeat2 className="h-3.5 w-3.5" />
            {currentPlatform ? t('changeAgent') : t('chooseAgent')}
          </button>
        </div>

        <button
          type="button"
          onClick={() => currentPlatform
            ? void handlePlatformSelect(currentPlatform.key)
            : setModalOpen(true)}
          disabled={disabled || loading}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShoppingCart className="h-5 w-5" />
          {loading
            ? t('openingAgent')
            : currentPlatform
              ? t('continueTo', { platform: preferredName })
              : t('chooseAgentToBuy')}
        </button>

        <p className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-muted">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-indigo" />
          {t('finalPriceNotice')}
        </p>
      </div>

      <PlatformSelectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={handlePlatformSelect}
      />
    </>
  );
}
