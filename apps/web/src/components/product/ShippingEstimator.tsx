'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calculator, Info, PackageOpen } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import {
  getLocalizedPlatformName,
  usePlatformStore,
} from '@/stores/usePlatformStore';
import {
  calculateShippingEstimateUsd,
  SHIPPING_DESTINATIONS,
  type ShippingDestination,
} from '@/lib/shipping-estimate';
import { convertPrice, formatPrice } from '@/lib/utils';

interface ShippingEstimatorProps {
  compact?: boolean;
}

export default function ShippingEstimator({ compact = false }: ShippingEstimatorProps) {
  const t = useTranslations('shippingEstimator');
  const locale = useLocale();
  const { platforms, platformKey, fetchPlatforms } = usePlatformStore();
  const { currency, rates } = useCurrencyStore();
  const [destination, setDestination] = useState<ShippingDestination>('US');
  const [weightKg, setWeightKg] = useState(1);
  const [agentKey, setAgentKey] = useState('');

  useEffect(() => {
    if (platforms.length === 0) void fetchPlatforms();
  }, [fetchPlatforms, platforms.length]);

  useEffect(() => {
    if (agentKey || platforms.length === 0) return;
    setAgentKey(platformKey || platforms[0].key);
  }, [agentKey, platformKey, platforms]);

  const selectedPlatform = platforms.find((platform) => platform.key === agentKey);
  const estimate = useMemo(
    () =>
      calculateShippingEstimateUsd({
        destination,
        weightKg,
        baseFeeUsd: selectedPlatform?.comparisonData?.shippingBaseFeeUsd,
        ratePerKgUsd: selectedPlatform?.comparisonData?.shippingRatePerKgUsd,
      }),
    [destination, selectedPlatform, weightKg],
  );
  const min = convertPrice(estimate.minUsd, 'USD', currency, rates);
  const max = convertPrice(estimate.maxUsd, 'USD', currency, rates);

  return (
    <section className="rounded-2xl border border-primary/15 bg-gradient-to-br from-white to-primary/[0.035] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Calculator className="h-4.5 w-4.5" />
          </span>
          <div>
            <h2 className="font-bold text-foreground">{t('title')}</h2>
            <p className="mt-0.5 text-xs leading-5 text-muted">{t('subtitle')}</p>
          </div>
        </div>
        <span className="rounded-full bg-accent/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
          {t('estimated')}
        </span>
      </div>

      <div className={`mt-4 grid gap-3 ${compact ? 'grid-cols-2' : 'sm:grid-cols-3'}`}>
        <label className="text-xs font-semibold text-foreground">
          {t('destination')}
          <select
            value={destination}
            onChange={(event) => setDestination(event.target.value as ShippingDestination)}
            className="mt-1.5 h-10 w-full rounded-lg border border-border bg-white px-2.5 text-sm font-normal outline-none focus:border-primary"
          >
            {SHIPPING_DESTINATIONS.map((code) => (
              <option key={code} value={code}>{t(`destinations.${code}`)}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-foreground">
          {t('weight')}
          <span className="relative mt-1.5 block">
            <input
              type="number"
              min="0.1"
              max="30"
              step="0.1"
              value={weightKg}
              onChange={(event) => setWeightKg(Number(event.target.value) || 0.1)}
              className="h-10 w-full rounded-lg border border-border bg-white px-2.5 pr-9 text-sm font-normal outline-none focus:border-primary"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-normal text-muted">kg</span>
          </span>
        </label>
        <label className={`text-xs font-semibold text-foreground ${compact ? 'col-span-2' : ''}`}>
          {t('agent')}
          <select
            value={agentKey}
            onChange={(event) => setAgentKey(event.target.value)}
            className="mt-1.5 h-10 w-full rounded-lg border border-border bg-white px-2.5 text-sm font-normal outline-none focus:border-primary"
          >
            {platforms.map((platform) => (
              <option key={platform.key} value={platform.key}>
                {getLocalizedPlatformName(platform, locale)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-secondary px-4 py-3 text-white">
        <div className="flex items-center gap-2 text-xs text-white/65">
          <PackageOpen className="h-4 w-4" />
          {estimate.usesPlatformRates ? t('configuredRate') : t('generalRate')}
        </div>
        <div className="text-right text-lg font-extrabold">
          {formatPrice(min, currency)} – {formatPrice(max, currency)}
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          {t('notice')}{' '}
          <Link href="/agents/compare" className="font-semibold text-primary hover:underline">
            {t('compareAgents')}
          </Link>
        </p>
      </div>
    </section>
  );
}
