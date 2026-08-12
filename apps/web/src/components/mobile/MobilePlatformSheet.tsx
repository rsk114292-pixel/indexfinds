'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { MobileSheet } from './ui/MobileSheet';
import PlatformLogoBadge from '@/components/platforms/PlatformLogoBadge';
import {
  getLocalizedPlatformName,
  type Platform,
  usePlatformStore,
} from '@/stores/usePlatformStore';
import {
  readRecentPlatformKeys,
  rememberRecentPlatform,
} from '@/lib/platform-recents';
import { cn } from '@/lib/utils';

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
  const [query, setQuery] = useState('');
  const [recentKeys, setRecentKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setRecentKeys(readRecentPlatformKeys());
    if (platforms.length === 0) void fetchPlatforms();
  }, [fetchPlatforms, open, platforms.length]);

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

  const handleSelect = (platform: Platform) => {
    setPlatform(platform.key);
    setRecentKeys(rememberRecentPlatform(platform.key));
    setQuery('');
    onClose();
  };

  const renderPlatform = (platform: Platform) => {
    const localizedName = getLocalizedPlatformName(platform, locale);
    const selected = platformKey === platform.key;
    return (
      <button
        key={platform.id}
        type="button"
        onClick={() => handleSelect(platform)}
        className={cn(
          'flex min-w-0 items-center gap-2.5 rounded-xl border-2 p-3 text-left transition-colors',
          selected
            ? 'border-primary bg-primary/5'
            : 'border-border bg-white active:bg-gray-50',
        )}
      >
        <PlatformLogoBadge
          platformKey={platform.key}
          name={localizedName}
          logoUrl={platform.logoUrl}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          imageClassName="h-9 w-9 shrink-0 rounded-lg object-contain"
          labelClassName="text-[10px] font-bold"
        />
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-sm font-medium',
            selected ? 'text-primary' : 'text-foreground',
          )}
        >
          {localizedName}
        </span>
        {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
      </button>
    );
  };

  return (
    <MobileSheet open={open} onClose={onClose} title={t('chooseAgent')}>
      <div className="pb-4">
        <p className="mb-3 text-sm text-muted">
          {t('agentsAvailable', { count: platforms.length })}
        </p>
        <label className="mb-4 flex h-11 items-center gap-2 rounded-xl border border-border bg-gray-50 px-3 focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10">
          <Search className="h-4 w-4 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('platformSearch')}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </label>

        {recentPlatforms.length > 0 && (
          <section className="mb-5">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
              {t('recentAgents')}
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {recentPlatforms.map(renderPlatform)}
            </div>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
            {query.trim() ? t('searchResults') : t('allAgents')}
          </h3>
          {remainingPlatforms.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5">
              {remainingPlatforms.map(renderPlatform)}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted">
              {t('noAgentResults')}
            </p>
          )}
        </section>

        <Link
          href="/agents"
          onClick={onClose}
          className="mt-5 flex h-11 items-center justify-center rounded-xl bg-secondary text-sm font-semibold text-white"
        >
          {t('viewAgentGuides')}
        </Link>
      </div>
    </MobileSheet>
  );
}
