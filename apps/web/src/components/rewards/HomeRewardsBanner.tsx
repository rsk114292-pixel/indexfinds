'use client';

import { Coins, Gift, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function HomeRewardsBanner() {
  const t = useTranslations('home.rewardsSpotlight');

  return (
    <div className="relative overflow-hidden rounded-[14px] border border-primary/12 bg-[linear-gradient(135deg,#fffdfb,#fff4ec)] px-3.5 py-2 shadow-[0_6px_16px_rgba(255,107,71,0.08)] md:rounded-[16px] md:border-primary/20 md:bg-[linear-gradient(90deg,rgba(255,255,255,0.08),rgba(255,248,238,0.05),rgba(255,214,161,0.1))] md:px-4 md:py-2.5 md:shadow-[0_8px_18px_rgba(255,107,71,0.06)] md:backdrop-blur">
      <div className="absolute inset-y-0 left-0 hidden w-24 bg-[radial-gradient(circle_at_left,rgba(255,169,106,0.16),transparent_72%)] md:block" />
      <div className="absolute inset-y-0 right-0 hidden w-20 bg-[radial-gradient(circle_at_right,rgba(255,209,102,0.14),transparent_72%)] md:block" />

      <div className="relative md:hidden">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 flex-1 text-[13px] font-semibold leading-5 text-slate-900">
            {t('mobileTitle')}
          </p>
          <Link
            href="/account/points"
            className="inline-flex min-h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-3 text-[11px] font-semibold text-primary transition-colors duration-200 hover:bg-primary/12"
          >
            <Share2 className="h-3.5 w-3.5" />
            {t('primaryCta')}
          </Link>
        </div>
      </div>

      <div className="relative hidden md:flex md:flex-col md:gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
              <Gift className="h-3 w-3" />
              {t('eyebrow')}
            </span>
            <p className="min-w-0 text-[14px] font-semibold leading-6 text-white sm:text-[15px]">
              <span>{t('title')}</span>
              <span className="ml-2 text-white/72">{t('body')}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[11px] font-medium text-white/84">
            <Coins className="h-3.5 w-3.5 text-primary" />
            {t('pointsRate')}
          </span>
          <Link
            href="/account/points"
            className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-full bg-primary px-3 text-[11px] font-semibold text-white shadow-[0_8px_18px_rgba(255,107,71,0.14)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-hover"
          >
            <Share2 className="h-3.5 w-3.5" />
            {t('primaryCta')}
          </Link>
        </div>
      </div>
    </div>
  );
}
