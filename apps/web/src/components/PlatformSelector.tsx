'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Search, Store } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import PlatformLogoBadge from '@/components/platforms/PlatformLogoBadge';
import {
  getLocalizedPlatformName,
  type Platform,
  useCurrentPlatform,
  usePlatformStore,
} from '@/stores/usePlatformStore';
import {
  readRecentPlatformKeys,
  rememberRecentPlatform,
} from '@/lib/platform-recents';
import { cn } from '@/lib/utils';
import Popover from '@/components/ui/Popover';

interface PlatformSelectorProps {
  variant?: 'header' | 'hero';
}

export default function PlatformSelector({
  variant = 'header',
}: PlatformSelectorProps) {
  const { platforms, platformKey, setPlatform, fetchPlatforms } =
    usePlatformStore();
  const currentPlatform = useCurrentPlatform();
  const locale = useLocale();
  const t = useTranslations('header');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recentKeys, setRecentKeys] = useState<string[]>([]);

  useEffect(() => {
    setRecentKeys(readRecentPlatformKeys());
    if (platforms.length === 0) void fetchPlatforms();
  }, [fetchPlatforms, platforms.length]);

  const filteredPlatforms = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return platforms;
    return platforms.filter((platform) =>
      getLocalizedPlatformName(platform, locale)
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [locale, platforms, query]);

  const recentPlatforms = useMemo(() => {
    if (query.trim()) return [];
    return recentKeys
      .map((key) => platforms.find((platform) => platform.key === key))
      .filter((platform): platform is Platform => Boolean(platform));
  }, [platforms, query, recentKeys]);

  const remainingPlatforms = useMemo(() => {
    const recentSet = new Set(recentPlatforms.map((platform) => platform.key));
    return filteredPlatforms.filter((platform) => !recentSet.has(platform.key));
  }, [filteredPlatforms, recentPlatforms]);

  const selectPlatform = (platform: Platform) => {
    setPlatform(platform.key);
    setRecentKeys(rememberRecentPlatform(platform.key));
    setOpen(false);
    setQuery('');
  };

  const renderPlatform = (platform: Platform) => {
    const name = getLocalizedPlatformName(platform, locale);
    const selected = platform.key === platformKey;

    return (
      <button
        key={platform.key}
        type="button"
        onClick={() => selectPlatform(platform)}
        className={cn(
          'flex min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors',
          selected
            ? 'border-primary/30 bg-primary/[0.07] text-primary'
            : 'border-transparent bg-gray-50/80 text-foreground hover:border-border hover:bg-white',
        )}
      >
        <PlatformLogoBadge
          platformKey={platform.key}
          name={name}
          logoUrl={platform.logoUrl}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          imageClassName="h-8 w-8 shrink-0 rounded-lg object-contain"
          labelClassName="text-[10px] font-bold"
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {name}
        </span>
        {selected && <Check className="h-4 w-4 shrink-0" />}
      </button>
    );
  };

  const content = (
    <div className="w-[430px] max-w-[calc(100vw-32px)] p-1">
      <div className="mb-3">
        <p className="text-base font-bold text-foreground">
          {t('chooseAgent')}
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {t('agentsAvailable', { count: platforms.length })}
        </p>
      </div>

      <label className="mb-3 flex h-10 items-center gap-2 rounded-xl border border-border bg-white px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
        <Search className="h-4 w-4 text-muted" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('platformSearch')}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
        />
      </label>

      <div className="max-h-[430px] space-y-4 overflow-y-auto overscroll-contain pr-1">
        {recentPlatforms.length > 0 && (
          <section>
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
              {t('recentAgents')}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {recentPlatforms.map(renderPlatform)}
            </div>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
            {query.trim() ? t('searchResults') : t('allAgents')}
          </h3>
          {remainingPlatforms.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {remainingPlatforms.map(renderPlatform)}
            </div>
          ) : (
            <p className="rounded-xl bg-gray-50 py-8 text-center text-sm text-muted">
              {t('noAgentResults')}
            </p>
          )}
        </section>
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <Link
          href="/agents"
          onClick={() => setOpen(false)}
          className="flex h-10 items-center justify-center rounded-xl bg-secondary text-sm font-semibold text-white transition-colors hover:bg-secondary/90"
        >
          {t('viewAgentGuides')}
        </Link>
      </div>
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen: boolean) => {
        setOpen(nextOpen);
        if (!nextOpen) setQuery('');
      }}
      align={variant === 'hero' ? 'center' : 'end'}
      panelClassName="p-1"
      trigger={({ controls, expanded, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-controls={controls}
          aria-expanded={expanded}
          className={cn(
            'flex items-center transition-colors',
            variant === 'hero'
              ? 'h-11 gap-2.5 rounded-full border border-white/10 bg-white/[0.07] px-4 text-white/85 hover:bg-white/[0.11] hover:text-white'
              : 'h-10 gap-1.5 rounded-lg px-2 text-white/75 hover:bg-white/[0.06] hover:text-white',
          )}
          aria-label={t('platformSelect')}
        >
          {currentPlatform ? (
            <PlatformLogoBadge
              platformKey={currentPlatform.key}
              name={getLocalizedPlatformName(currentPlatform, locale)}
              logoUrl={currentPlatform.logoUrl}
              className="flex h-6 w-6 items-center justify-center rounded-md"
              imageClassName="h-6 w-6 rounded-md object-contain"
              labelClassName="text-[8px] font-bold"
            />
          ) : (
            <Store className="h-5 w-5" />
          )}
          {variant === 'hero' && (
            <span className="text-left">
              <span className="block text-[10px] uppercase tracking-[0.12em] text-white/45">
                {t('buyThrough')}
              </span>
              <span className="block max-w-[150px] truncate text-sm font-semibold leading-4">
                {currentPlatform
                  ? getLocalizedPlatformName(currentPlatform, locale)
                  : t('noPlatformSelected')}
              </span>
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      )}
    >
      {content}
    </Popover>
  );
}
