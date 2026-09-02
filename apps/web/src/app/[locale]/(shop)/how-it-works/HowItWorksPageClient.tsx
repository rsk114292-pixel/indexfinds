'use client';

import { useTranslations } from 'next-intl';
import {
  Search,
  SlidersHorizontal,
  ShoppingCart,
  PackageCheck,
  Package,
  RefreshCw,
  Camera,
  Users,
  ArrowRight,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { FadeIn } from '@/components/ui/FadeIn';

/* -------------------------------------------------------------------------- */
/*  Step data                                                                  */
/* -------------------------------------------------------------------------- */

const steps = [
  {
    num: 1,
    titleKey: 'steps.step1.title',
    descKey: 'steps.step1.description',
    Icon: Search,
    color: {
      badge: 'bg-blue-100 text-blue-600',
      iconBg: 'bg-blue-50',
      iconText: 'text-blue-600',
      gradient: 'from-blue-500 to-indigo-500',
      ring: 'ring-blue-200',
      line: 'border-blue-300',
    },
  },
  {
    num: 2,
    titleKey: 'steps.step2.title',
    descKey: 'steps.step2.description',
    Icon: SlidersHorizontal,
    color: {
      badge: 'bg-orange-100 text-primary',
      iconBg: 'bg-orange-50',
      iconText: 'text-primary',
      gradient: 'from-primary to-orange-500',
      ring: 'ring-orange-200',
      line: 'border-orange-300',
    },
  },
  {
    num: 3,
    titleKey: 'steps.step3.title',
    descKey: 'steps.step3.description',
    Icon: ShoppingCart,
    color: {
      badge: 'bg-emerald-100 text-emerald-600',
      iconBg: 'bg-emerald-50',
      iconText: 'text-emerald-600',
      gradient: 'from-emerald-500 to-teal-500',
      ring: 'ring-emerald-200',
      line: 'border-emerald-300',
    },
  },
  {
    num: 4,
    titleKey: 'steps.step4.title',
    descKey: 'steps.step4.description',
    Icon: PackageCheck,
    color: {
      badge: 'bg-purple-100 text-purple-600',
      iconBg: 'bg-purple-50',
      iconText: 'text-purple-600',
      gradient: 'from-purple-500 to-violet-500',
      ring: 'ring-purple-200',
      line: 'border-purple-300',
    },
  },
] as const;

const features = [
  { titleKey: 'features.products.title', descKey: 'features.products.description', Icon: Package },
  { titleKey: 'features.updates.title', descKey: 'features.updates.description', Icon: RefreshCw },
  { titleKey: 'features.qc.title', descKey: 'features.qc.description', Icon: Camera },
  { titleKey: 'features.agents.title', descKey: 'features.agents.description', Icon: Users },
] as const;

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function HowItWorksPageClient() {
  const t = useTranslations('howItWorksPage');

  return (
    <>
      <section className="relative overflow-hidden bg-secondary py-14 lg:py-20">
        <div className="pointer-events-none absolute -left-20 -top-20 h-[260px] w-[260px] rounded-full bg-primary/20 blur-[80px] lg:-left-32 lg:-top-32 lg:h-[420px] lg:w-[420px] lg:blur-[120px]" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-[200px] w-[200px] rounded-full bg-purple-500/20 blur-[70px] lg:-right-24 lg:h-[340px] lg:w-[340px] lg:blur-[100px]" />

        <div className="container relative mx-auto px-4 text-center">
          <FadeIn>
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
              {t('hero.title')}
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base text-gray-300 lg:mt-4 lg:text-lg">
              {t('hero.subtitle')}
            </p>
          </FadeIn>
        </div>
      </section>

      <section className="bg-background py-14 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="relative space-y-10 pl-10 lg:space-y-20 lg:pl-0">
            <div className="absolute left-[15px] top-0 h-full w-0.5 bg-border lg:left-1/2 lg:w-0 lg:-translate-x-px lg:border-l-2 lg:border-dashed" />

            {steps.map((step, idx) => {
              const isEven = idx % 2 === 1;
              return (
                <FadeIn key={step.num} direction={isEven ? 'right' : 'left'} delay={idx * 0.08}>
                  <div className="relative lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
                    <div className={`hidden lg:block ${isEven ? 'lg:order-2' : 'lg:order-1'}`}>
                      <div className={`relative mx-auto flex h-64 w-full max-w-md flex-col items-center justify-center rounded-2xl bg-gradient-to-br ${step.color.gradient} p-8 shadow-lg`}>
                        <span className="absolute right-6 top-4 text-7xl font-extrabold text-white/10">
                          {String(step.num).padStart(2, '0')}
                        </span>
                        <step.Icon className="h-16 w-16 text-white" strokeWidth={1.5} />
                        <span className="mt-4 text-lg font-semibold text-white/90">
                          {t(`steps.step${step.num}.label` as `steps.step1.label`)}
                        </span>
                      </div>
                    </div>

                    <div className={`rounded-2xl border border-border bg-surface p-5 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 ${isEven ? 'lg:order-1 lg:text-right' : 'lg:order-2'}`}>
                      <div className="flex items-center gap-3 lg:block">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl lg:hidden ${step.color.iconBg}`}>
                          <step.Icon className={`h-5 w-5 ${step.color.iconText}`} />
                        </div>
                        <div>
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium lg:text-sm ${step.color.badge}`}>
                            {t('steps.stepLabel')} {step.num}
                          </span>
                          <h2 className="mt-1 text-lg font-bold text-foreground lg:mt-3 lg:text-2xl">
                            {t(step.titleKey)}
                          </h2>
                        </div>
                      </div>
                      <p className={`mt-3 text-sm leading-relaxed text-muted lg:mt-2 lg:text-base ${isEven ? 'lg:ml-auto' : ''} max-w-md`}>
                        {t(step.descKey)}
                      </p>
                    </div>

                    <div className={`absolute -left-10 top-0 z-10 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-gradient-to-br ${step.color.gradient} shadow-sm lg:left-1/2 lg:top-1/2 lg:h-10 lg:w-10 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:border-4 lg:border-background`}>
                      <span className="text-xs font-bold text-white lg:text-sm">{step.num}</span>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-background py-14 lg:py-20">
        <div className="container mx-auto px-4">
          <FadeIn>
            <h2 className="text-center text-2xl font-bold text-foreground lg:text-3xl">
              {t('features.title')}
            </h2>
          </FadeIn>

          <div className="mt-8 grid grid-cols-2 gap-4 lg:mt-12 lg:grid-cols-4 lg:gap-6">
            {features.map((feat, i) => (
              <FadeIn key={feat.titleKey} delay={i * 0.08}>
                <div className="flex h-full flex-col items-center rounded-2xl border border-border bg-surface p-5 text-center transition-shadow hover:shadow-md lg:p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 lg:h-12 lg:w-12">
                    <feat.Icon className="h-5 w-5 text-primary lg:h-6 lg:w-6" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-foreground lg:mt-4 lg:text-lg">
                    {t(feat.titleKey)}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted lg:mt-2 lg:text-sm">
                    {t(feat.descKey)}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background py-14 lg:py-20">
        <div className="container mx-auto px-4">
          <FadeIn>
            <div className="rounded-2xl border border-border bg-surface p-8 text-center lg:p-12">
              <h2 className="text-2xl font-bold text-foreground lg:text-3xl">{t('cta.title')}</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm text-muted lg:mt-3 lg:text-base">
                {t('cta.description')}
              </p>
              <Link href="/products" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-hover lg:mt-6">
                {t('cta.button')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
