'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, ShoppingCart, PackageCheck } from 'lucide-react';
import { FadeIn } from '@/components/ui/FadeIn';

const STEPS = [
  {
    icon: Search,
    titleKey: 'howItWorks.searchTitle',
    descKey: 'howItWorks.searchDesc',
    color: 'from-blue-500 to-indigo-500',
    bg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    icon: SlidersHorizontal,
    titleKey: 'howItWorks.compareTitle',
    descKey: 'howItWorks.compareDesc',
    color: 'from-primary to-orange-500',
    bg: 'bg-orange-50',
    iconColor: 'text-primary',
  },
  {
    icon: ShoppingCart,
    titleKey: 'howItWorks.chooseTitle',
    descKey: 'howItWorks.chooseDesc',
    color: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    icon: PackageCheck,
    titleKey: 'howItWorks.receiveTitle',
    descKey: 'howItWorks.receiveDesc',
    color: 'from-purple-500 to-violet-500',
    bg: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
];

export default function HowItWorksSection() {
  const t = useTranslations('home');
  return (
    <section className="bg-gray-50/80">
      <div className="container mx-auto px-4 py-14 md:py-20">
        {/* Header */}
        <FadeIn>
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              {t('howItWorks.title')}
            </h2>
            <p className="text-muted text-sm md:text-base max-w-lg mx-auto">
              {t('howItWorks.subtitle')}
            </p>
          </div>
        </FadeIn>

        {/* Steps */}
        <div className="relative max-w-4xl mx-auto">
          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-14 left-[calc(12.5%+20px)] right-[calc(12.5%+20px)] h-px bg-border z-0" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.titleKey}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.1 * index, ease: 'easeOut' }}
                  className="relative flex flex-col items-center text-center"
                >
                  {/* Step number + icon */}
                  <div className="relative z-10 mb-4">
                    <div className={`w-16 h-16 md:w-[72px] md:h-[72px] rounded-2xl ${step.bg} flex items-center justify-center shadow-sm`}>
                      <Icon className={`w-7 h-7 ${step.iconColor}`} />
                    </div>
                    {/* Step number badge */}
                    <div
                      className={`absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center shadow-md`}
                    >
                      <span className="text-white text-xs font-bold">{index + 1}</span>
                    </div>
                  </div>

                  {/* Text */}
                  <h3 className="text-base font-semibold text-foreground mb-1.5">
                    {t(step.titleKey)}
                  </h3>
                  <p className="text-xs md:text-sm text-muted leading-relaxed max-w-[180px]">
                    {t(step.descKey)}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
