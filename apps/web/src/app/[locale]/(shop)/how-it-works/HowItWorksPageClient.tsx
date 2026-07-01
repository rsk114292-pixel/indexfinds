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
      {/* ================================================================== */}
      {/* PC 端视图                                                          */}
      {/* ================================================================== */}
      <div className="hidden lg:block">
        {/* ---------- Hero ---------- */}
        <section className="relative overflow-hidden bg-secondary py-20">
          {/* Decorative glows */}
          <div className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-primary/20 blur-[120px]" />
          <div className="pointer-events-none absolute -right-24 bottom-0 h-[340px] w-[340px] rounded-full bg-purple-500/20 blur-[100px]" />

          <div className="container relative mx-auto px-4 text-center">
            <FadeIn>
              <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
                {t('hero.title')}
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-300">
                {t('hero.subtitle')}
              </p>
            </FadeIn>
          </div>
        </section>

        {/* ---------- Steps (zigzag) ---------- */}
        <section className="bg-background py-20">
          <div className="container mx-auto px-4">
            <div className="relative space-y-20">
              {/* Vertical dashed line connecting steps */}
              <div className="absolute left-1/2 top-0 hidden h-full -translate-x-px border-l-2 border-dashed border-border lg:block" />

              {steps.map((step, idx) => {
                const isEven = idx % 2 === 1;
                return (
                  <FadeIn
                    key={step.num}
                    direction={isEven ? 'right' : 'left'}
                    delay={idx * 0.1}
                  >
                    <div
                      className={`relative grid grid-cols-2 items-center gap-12 ${
                        isEven ? '' : ''
                      }`}
                    >
                      {/* ---------- Visual card ---------- */}
                      <div
                        className={`${isEven ? 'order-2' : 'order-1'}`}
                      >
                        <div
                          className={`relative mx-auto flex h-64 w-full max-w-md flex-col items-center justify-center rounded-2xl bg-gradient-to-br ${step.color.gradient} p-8 shadow-lg`}
                        >
                          {/* Large step number watermark */}
                          <span className="absolute right-6 top-4 text-7xl font-extrabold text-white/10">
                            {String(step.num).padStart(2, '0')}
                          </span>
                          <step.Icon className="h-16 w-16 text-white" strokeWidth={1.5} />
                          <span className="mt-4 text-lg font-semibold text-white/90">
                            {t(`steps.step${step.num}.label` as `steps.step1.label`)}
                          </span>
                        </div>
                      </div>

                      {/* ---------- Text content ---------- */}
                      <div
                        className={`${isEven ? 'order-1 text-right' : 'order-2'}`}
                      >
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${step.color.badge}`}
                        >
                          {t('steps.stepLabel')} {step.num}
                        </span>
                        <h3 className="mt-3 text-2xl font-bold text-foreground">
                          {t(step.titleKey)}
                        </h3>
                        <p className="mt-2 max-w-md text-muted leading-relaxed">
                          {t(step.descKey)}
                        </p>
                      </div>

                      {/* Center dot on timeline */}
                      <div className="absolute left-1/2 top-1/2 z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-background bg-gradient-to-br shadow-md">
                        <div
                          className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br ${step.color.gradient}`}
                        >
                          <span className="text-sm font-bold text-white">{step.num}</span>
                        </div>
                      </div>
                    </div>
                  </FadeIn>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------- Features ---------- */}
        <section className="bg-background py-20">
          <div className="container mx-auto px-4">
            <FadeIn>
              <h2 className="text-center text-3xl font-bold text-foreground">
                {t('features.title')}
              </h2>
            </FadeIn>

            <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
              {features.map((feat, i) => (
                <FadeIn key={feat.titleKey} delay={i * 0.1}>
                  <div className="flex flex-col items-center rounded-2xl border border-border bg-surface p-6 text-center transition-shadow hover:shadow-md">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <feat.Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="mt-4 text-lg font-semibold text-foreground">
                      {t(feat.titleKey)}
                    </h4>
                    <p className="mt-2 text-sm text-muted leading-relaxed">
                      {t(feat.descKey)}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- CTA ---------- */}
        <section className="bg-background py-20">
          <div className="container mx-auto px-4">
            <FadeIn>
              <div className="rounded-2xl border border-border bg-surface p-12 text-center">
                <h2 className="text-3xl font-bold text-foreground">
                  {t('cta.title')}
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-muted">
                  {t('cta.description')}
                </p>
                <Link
                  href="/products"
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-hover"
                >
                  {t('cta.button')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>
      </div>

      {/* ================================================================== */}
      {/* Mobile 端视图                                                      */}
      {/* ================================================================== */}
      <div className="lg:hidden">
        {/* ---------- Hero ---------- */}
        <section className="relative overflow-hidden bg-secondary py-14">
          {/* Decorative glows */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-[260px] w-[260px] rounded-full bg-primary/20 blur-[80px]" />
          <div className="pointer-events-none absolute -right-16 bottom-0 h-[200px] w-[200px] rounded-full bg-purple-500/20 blur-[70px]" />

          <div className="container relative mx-auto px-4 text-center">
            <FadeIn>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                {t('hero.title')}
              </h1>
              <p className="mx-auto mt-3 max-w-md text-base text-gray-300">
                {t('hero.subtitle')}
              </p>
            </FadeIn>
          </div>
        </section>

        {/* ---------- Steps (timeline) ---------- */}
        <section className="bg-background py-14">
          <div className="container mx-auto px-4">
            {/* Timeline wrapper */}
            <div className="relative pl-10">
              {/* Vertical timeline line */}
              <div className="absolute left-[15px] top-0 h-full w-0.5 bg-border" />

              {steps.map((step, idx) => (
                <FadeIn key={step.num} delay={idx * 0.08}>
                  <div
                    className={`relative pb-12 ${idx === steps.length - 1 ? 'pb-0' : ''}`}
                  >
                    {/* Timeline dot */}
                    <div
                      className={`absolute -left-10 top-0 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-gradient-to-br ${step.color.gradient} shadow-sm`}
                    >
                      <span className="text-xs font-bold text-white">{step.num}</span>
                    </div>

                    {/* Content */}
                    <div className="rounded-2xl border border-border bg-surface p-5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${step.color.iconBg}`}
                        >
                          <step.Icon className={`h-5 w-5 ${step.color.iconText}`} />
                        </div>
                        <div>
                          <span
                            className={`text-xs font-medium ${step.color.badge} rounded-full px-2 py-0.5`}
                          >
                            {t('steps.stepLabel')} {step.num}
                          </span>
                          <h3 className="mt-0.5 text-lg font-bold text-foreground">
                            {t(step.titleKey)}
                          </h3>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-muted leading-relaxed">
                        {t(step.descKey)}
                      </p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Features ---------- */}
        <section className="bg-background py-14">
          <div className="container mx-auto px-4">
            <FadeIn>
              <h2 className="text-center text-2xl font-bold text-foreground">
                {t('features.title')}
              </h2>
            </FadeIn>

            <div className="mt-8 grid grid-cols-2 gap-4">
              {features.map((feat, i) => (
                <FadeIn key={feat.titleKey} delay={i * 0.08}>
                  <div className="flex flex-col items-center rounded-2xl border border-border bg-surface p-5 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <feat.Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h4 className="mt-3 text-sm font-semibold text-foreground">
                      {t(feat.titleKey)}
                    </h4>
                    <p className="mt-1.5 text-xs text-muted leading-relaxed">
                      {t(feat.descKey)}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- CTA ---------- */}
        <section className="bg-background py-14">
          <div className="container mx-auto px-4">
            <FadeIn>
              <div className="rounded-2xl border border-border bg-surface p-8 text-center">
                <h2 className="text-2xl font-bold text-foreground">
                  {t('cta.title')}
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                  {t('cta.description')}
                </p>
                <Link
                  href="/products"
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-hover"
                >
                  {t('cta.button')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>
      </div>
    </>
  );
}
