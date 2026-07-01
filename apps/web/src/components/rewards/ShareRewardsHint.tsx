'use client';

import { Gift, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function ShareRewardsHint() {
  const t = useTranslations('share.rewardsHint');
  const body = t('body').trim();

  return (
    <div className="relative overflow-hidden rounded-[20px] border border-[#f0dbc6] bg-[linear-gradient(135deg,rgba(255,250,244,0.98),rgba(255,241,226,0.94))] p-4 shadow-[0_10px_24px_rgba(45,29,9,0.06)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary/75 via-[#f1bf56] to-transparent" />
      <div className="flex items-start gap-3">
        <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-primary shadow-sm">
          <Gift className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/75 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {t('eyebrow')}
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#231912]">
            {t('title')}
          </p>
          {body ? (
            <p className="mt-1 text-sm leading-6 text-stone-600">{body}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
