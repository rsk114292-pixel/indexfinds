'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  CreditCard,
  PackageOpen,
  Scale,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import PlatformLogoBadge from '@/components/platforms/PlatformLogoBadge';
import {
  SHIPPING_DESTINATIONS,
  type ShippingDestination,
} from '@/lib/shipping-estimate';
import {
  hasPlatformDataForPriority,
  recommendAgentOptions,
  type AgentMatchPriority,
} from '@/lib/agent-recommendation';
import {
  getLocalizedPlatformName,
  usePlatformStore,
} from '@/stores/usePlatformStore';
import { cn } from '@/lib/utils';

const PRIORITIES: Array<{
  key: AgentMatchPriority;
  icon: typeof WalletCards;
  label: 'matchBudget' | 'matchStorage' | 'matchQc' | 'matchPayment';
}> = [
  { key: 'budget', icon: WalletCards, label: 'matchBudget' },
  { key: 'storage', icon: PackageOpen, label: 'matchStorage' },
  { key: 'qc', icon: Camera, label: 'matchQc' },
  { key: 'payment', icon: CreditCard, label: 'matchPayment' },
];

export default function AgentMatchWizard() {
  const t = useTranslations('agents');
  const shippingT = useTranslations('shippingEstimator');
  const locale = useLocale();
  const [destination, setDestination] = useState<ShippingDestination>('US');
  const [weightKg, setWeightKg] = useState(1);
  const [priority, setPriority] = useState<AgentMatchPriority>('budget');
  const { platforms, platformKey, setPlatform, fetchPlatforms } = usePlatformStore();

  useEffect(() => {
    if (platforms.length === 0) void fetchPlatforms();
  }, [fetchPlatforms, platforms.length]);

  const recommendations = useMemo(
    () =>
      recommendAgentOptions({
        platforms,
        destination,
        weightKg,
        priority,
      }),
    [destination, platforms, priority, weightKg],
  );
  const availablePriorities = useMemo(
    () =>
      new Set(
        PRIORITIES.filter(({ key }) =>
          platforms.some(
            (platform) =>
              platform.isActive && hasPlatformDataForPriority(platform, key),
          ),
        ).map(({ key }) => key),
      ),
    [platforms],
  );

  return (
    <section className="container mx-auto px-4 pt-8 md:pt-10">
      <div className="overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
        <div className="grid gap-8 p-5 md:p-8 lg:grid-cols-[0.86fr_1.14fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-indigo/10 px-3 py-1.5 text-xs font-bold text-brand-indigo">
              <BadgeCheck className="h-3.5 w-3.5" />
              {t('matchEyebrow')}
            </span>
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
              {t('matchTitle')}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
              {t('matchSubtitle')}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-foreground">
                {shippingT('destination')}
                <select
                  value={destination}
                  onChange={(event) =>
                    setDestination(event.target.value as ShippingDestination)
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm font-medium outline-none transition-colors focus:border-primary"
                >
                  {SHIPPING_DESTINATIONS.map((code) => (
                    <option key={code} value={code}>
                      {shippingT(`destinations.${code}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-foreground">
                {shippingT('weight')}
                <div className="relative mt-2">
                  <input
                    type="number"
                    min="0.1"
                    max="30"
                    step="0.1"
                    value={weightKg}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (Number.isFinite(next)) setWeightKg(Math.min(30, Math.max(0.1, next)));
                    }}
                    className="h-11 w-full rounded-xl border border-border bg-white px-3 pr-12 text-sm font-medium outline-none transition-colors focus:border-primary"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-bold text-muted">
                    kg
                  </span>
                </div>
              </label>
            </div>

            <fieldset className="mt-5">
              <legend className="text-xs font-bold text-foreground">
                {t('matchPriority')}
              </legend>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                {PRIORITIES.map(({ key, icon: Icon, label }) => {
                  const available = availablePriorities.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={priority === key}
                      disabled={!available}
                      onClick={() => setPriority(key)}
                      className={cn(
                        'flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-bold transition-colors',
                        priority === key && available
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-gray-50 text-muted hover:border-primary/30 hover:text-foreground',
                        !available &&
                          'cursor-not-allowed border-dashed opacity-50 hover:border-border hover:text-muted',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {t(label)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                  {t('optionsToReview')}
                </p>
                <p className="mt-1 text-xs text-muted">{t('reviewMatchesNotice')}</p>
              </div>
              <Link
                href="/agents/compare"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
              >
                <Scale className="h-3.5 w-3.5" />
                {t('compareAgents')}
              </Link>
            </div>

            <div className="mt-4 grid gap-3">
              {recommendations.length > 0 ? (
                recommendations.map(({ platform, estimate, configuredFields }, index) => {
                  const name = getLocalizedPlatformName(platform, locale);
                  const isPreferred = platformKey === platform.key;
                  return (
                    <article
                      key={platform.key}
                      className="rounded-2xl border border-border bg-white p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-1 text-xs font-extrabold text-muted">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <PlatformLogoBadge
                          platformKey={platform.key}
                          name={name}
                          logoUrl={platform.logoUrl}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                          imageClassName="h-10 w-10 rounded-xl object-contain"
                          labelClassName="text-[10px] font-extrabold"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="truncate text-sm font-extrabold text-foreground">
                              {name}
                            </h3>
                            <span className="text-sm font-extrabold text-primary">
                              ${estimate.minUsd.toFixed(0)}–${estimate.maxUsd.toFixed(0)} USD
                            </span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-muted">
                            <span className="rounded-full bg-gray-100 px-2 py-1">
                              {estimate.usesPlatformRates
                                ? shippingT('configuredRate')
                                : shippingT('generalRate')}
                            </span>
                            <span>{t('configuredFields', { count: configuredFields })}</span>
                            {typeof platform.comparisonData?.freeStorageDays === 'number' && (
                              <span>
                                {t('freeStorageDaysValue', {
                                  count: platform.comparisonData.freeStorageDays,
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2 pl-0 sm:pl-16">
                        <button
                          type="button"
                          onClick={() => setPlatform(platform.key)}
                          disabled={isPreferred}
                          className={cn(
                            'flex h-9 flex-1 items-center justify-center rounded-lg px-3 text-xs font-bold transition-colors',
                            isPreferred
                              ? 'cursor-default bg-emerald-50 text-emerald-700'
                              : 'bg-secondary text-white hover:bg-secondary/90',
                          )}
                        >
                          {isPreferred ? t('preferred') : t('setPreferred')}
                        </button>
                        <Link
                          href={`/agents/${platform.key}`}
                          className="flex h-9 items-center justify-center gap-1 rounded-lg border border-border px-3 text-xs font-bold text-foreground hover:border-primary/30 hover:text-primary"
                        >
                          {t('indexFindsGuide')}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </article>
                  );
                })
              ) : platforms.length === 0 ? (
                <div className="grid gap-3" aria-hidden="true">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="h-28 animate-pulse rounded-2xl bg-white" />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-white px-5 py-10 text-center">
                  <ShieldCheck className="mx-auto h-7 w-7 text-muted" aria-hidden="true" />
                  <p className="mt-3 text-sm font-bold text-foreground">
                    {t('notConfigured')}
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-muted">
                    {t('comparisonNoticeBody')}
                  </p>
                </div>
              )}
            </div>

            <p className="mt-4 text-[11px] leading-5 text-muted">
              {shippingT('notice')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
