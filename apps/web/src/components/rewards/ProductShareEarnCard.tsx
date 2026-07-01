'use client';

import { Gift, Share2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

interface ProductShareEarnCardProps {
  onShare: () => void;
  compact?: boolean;
}

export default function ProductShareEarnCard({
  onShare,
  compact = false,
}: ProductShareEarnCardProps) {
  const t = useTranslations('product.shareRewards');
  const body = t('body').trim();

  if (compact) {
    return (
      <div className="rounded-[18px] border border-[#f0dbc6] bg-[linear-gradient(135deg,#fffaf4,#fff3e8)] px-3.5 py-3 shadow-[0_8px_18px_rgba(45,29,9,0.04)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
              <Share2 className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold leading-5 text-[#231912]">
                {t('title')}
              </h3>
              {body ? (
                <p className="mt-0.5 text-xs leading-5 text-stone-500">{body}</p>
              ) : null}
            </div>
          </div>

          <Button
            size="sm"
            icon={<Share2 className="h-4 w-4" />}
            onClick={onShare}
            className="shrink-0"
          >
            {t('cta')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-[#f0dbc6] bg-[linear-gradient(135deg,rgba(255,250,244,0.98),rgba(255,241,226,0.94))] p-4 shadow-[0_12px_28px_rgba(45,29,9,0.06)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary/70 via-[#f0b44b] to-transparent" />
      <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[#ffd59f]/30 blur-3xl" />

      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            <Gift className="h-3.5 w-3.5" />
            {t('eyebrow')}
          </div>
          <div className="mt-3 flex items-start gap-3">
            <div className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff2e6] text-primary shadow-sm">
              <Share2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold leading-6 text-[#231912] sm:text-[1.05rem]">
                {t('title')}
              </h3>
              {body ? (
                <p className="mt-1 text-sm leading-6 text-stone-600">{body}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 md:items-end">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#ebc8ab] bg-white px-3 py-2 text-sm font-semibold text-primary shadow-sm">
            <Sparkles className="h-4 w-4" />
            {t('pill')}
          </span>
          <Button
            size="lg"
            icon={<Share2 className="h-4 w-4" />}
            onClick={onShare}
            className="min-w-[152px]"
          >
            {t('cta')}
          </Button>
        </div>
      </div>
    </div>
  );
}
