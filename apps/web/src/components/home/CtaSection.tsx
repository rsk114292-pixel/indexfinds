'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Camera, MessageSquare, Users } from 'lucide-react';
import { FadeIn } from '@/components/ui/FadeIn';

export default function CtaSection() {
  const t = useTranslations('home');
  return (
    <>
      {/* ── QC Community Placeholder ── */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-8 md:p-12">
            {/* Decorative background */}
            <div className="absolute top-0 right-0 w-64 h-64 opacity-[0.04]">
              <Camera className="w-full h-full" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="max-w-lg">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold mb-4">
                  <Users className="w-3.5 h-3.5" />
                  {t('cta.comingSoon')}
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                  {t('cta.qcCommunity')}
                </h2>
                <p className="text-sm md:text-base text-muted leading-relaxed">
                  {t('cta.qcCommunityDesc')}
                </p>
              </div>

              {/* Preview cards placeholder */}
              <div className="flex gap-3 flex-shrink-0">
                {[Camera, MessageSquare, Users].map((Icon, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 0.1 * i }}
                    className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-gray-100 border border-border flex items-center justify-center"
                  >
                    <Icon className="w-8 h-8 text-gray-300" />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── CTA Banner ── */}
      <section className="relative overflow-hidden bg-secondary">
        {/* Background orbs */}
        <div
          className="absolute -top-1/3 -right-1/4 w-[400px] h-[400px] rounded-full opacity-20 blur-[100px]"
          style={{ background: 'radial-gradient(circle, #FF6B47 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-1/3 -left-1/4 w-[350px] h-[350px] rounded-full opacity-15 blur-[80px]"
          style={{ background: 'radial-gradient(circle, #FFB347 0%, transparent 70%)' }}
        />

        <div className="relative z-10 container mx-auto px-4 py-14 md:py-20 text-center">
          <FadeIn>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4">
              {t('cta.startDiscovering')}
            </h2>
            <p className="text-white/60 text-sm md:text-base max-w-md mx-auto mb-8">
              {t('cta.startDiscoveringDesc')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition-colors duration-200 cursor-pointer"
              >
                {t('cta.browseProducts')}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/brands"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl border border-white/10 transition-colors duration-200 cursor-pointer"
              >
                {t('cta.exploreBrands')}
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
