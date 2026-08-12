"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles, Camera, Package, Crown, ShieldCheck } from "lucide-react";
import SearchBox from "@/components/SearchBox";
import PlatformSelector from "@/components/PlatformSelector";
import HotSearches from "@/components/HotSearches";
import { FadeIn } from "@/components/ui/FadeIn";
import { useHeaderStore } from "@/stores/useHeaderStore";

interface HotSearchItem {
  keyword: string;
  count: number;
}

interface HeroSectionProps {
  initialHotSearches?: HotSearchItem[];
  stats?: {
    totalProducts: number;
    totalBrands: number;
  };
}

export default function HeroSection({
  initialHotSearches,
  stats,
}: HeroSectionProps) {
  const t = useTranslations("home");
  const locale = useLocale();
  const searchRef = useRef<HTMLDivElement>(null);
  const setHeroSearchVisible = useHeaderStore((s) => s.setHeroSearchVisible);
  const numberFormatter = new Intl.NumberFormat(locale);

  const capabilityItems = [
    { icon: Sparkles, label: t("hero.featureAI") },
    { icon: Camera, label: t("hero.featureVisualSearch") },
    ...(stats
      ? [
          {
            icon: Package,
            label: t("hero.featureProducts", {
              count: numberFormatter.format(stats.totalProducts),
            }),
          },
          {
            icon: Crown,
            label: t("hero.featureBrands", {
              count: numberFormatter.format(stats.totalBrands),
            }),
          },
        ]
      : []),
  ];

  useEffect(() => {
    const el = searchRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroSearchVisible(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      setHeroSearchVisible(false);
    };
  }, [setHeroSearchVisible]);

  return (
    <section className="relative min-h-[460px] md:min-h-[520px] flex flex-col justify-center overflow-hidden bg-secondary">
      {/* ── Mesh Gradient Background ── */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Primary orb - top right */}
        <div
          className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full opacity-30 blur-[120px] animate-[drift_12s_ease-in-out_infinite]"
          style={{
            background: "radial-gradient(circle, #FF6B47 0%, transparent 70%)",
          }}
        />
        {/* Accent orb - bottom left */}
        <div
          className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] rounded-full opacity-20 blur-[100px] animate-[drift_10s_ease-in-out_infinite_reverse]"
          style={{
            background: "radial-gradient(circle, #FFB347 0%, transparent 70%)",
          }}
        />
        {/* Subtle secondary orb - center */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-10 blur-[140px] animate-[drift_14s_ease-in-out_infinite]"
          style={{
            background: "radial-gradient(circle, #6366F1 0%, transparent 70%)",
          }}
        />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* ── Main Content ── */}
      <div className="relative z-10 container mx-auto px-4 pt-12 pb-6 md:pt-20 md:pb-10">
        <FadeIn direction="down" duration={0.45}>
          <div className="mb-5 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-xs font-semibold text-white/75 backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              {t("hero.eyebrow")}
            </span>
          </div>
        </FadeIn>

        {/* Headline */}
        <FadeIn direction="down" duration={0.6}>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-5 leading-[1.08] tracking-[-0.04em]">
            <span className="text-white">{t("hero.headlinePrimary")}</span>
            <br />
            <span
              className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent"
              style={{
                backgroundSize: "200% auto",
                animation: "shimmer 4s linear infinite",
              }}
            >
              {t("hero.headlineSecondary")}
            </span>
          </h1>
        </FadeIn>

        <FadeIn direction="up" duration={0.5} delay={0.15}>
          <p className="text-white/60 text-center text-sm sm:text-base md:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            {t("hero.descLine1")}
            <br className="hidden md:block" />
            {t("hero.descLine2")}
          </p>
        </FadeIn>

        {/* Search */}
        <FadeIn direction="up" duration={0.5} delay={0.25}>
          <div
            ref={searchRef}
            className="relative mx-auto mb-4 w-full max-w-[920px]"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 h-[180px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-80 blur-[82px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(129,140,248,0.18) 0%, rgba(255,122,78,0.18) 38%, transparent 74%)",
              }}
            />
            <SearchBox size="large" />
          </div>
        </FadeIn>

        <FadeIn direction="up" duration={0.35} delay={0.3}>
          <div className="mx-auto mb-4 flex max-w-[860px] flex-wrap justify-center gap-2">
            {capabilityItems.map((item) => {
              const Icon = item.icon;
              return (
                <span
                  key={item.label}
                  className="inline-flex min-h-8 items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.05] px-3 py-1 text-xs font-medium text-white/70 backdrop-blur-sm"
                >
                  <Icon className="h-3.5 w-3.5 text-primary/90" />
                  {item.label}
                </span>
              );
            })}
          </div>
        </FadeIn>

        <FadeIn direction="up" duration={0.35} delay={0.34}>
          <div className="mx-auto mb-5 flex max-w-[860px] items-center justify-center gap-3">
            <span className="hidden text-xs font-medium text-white/45 sm:inline">
              {t("hero.agentPrompt")}
            </span>
            <PlatformSelector variant="hero" />
          </div>
        </FadeIn>

        {/* Hot Searches */}
        <FadeIn direction="up" duration={0.4} delay={0.4}>
          <HotSearches
            limit={6}
            source="general"
            initialSearches={initialHotSearches}
            className="mx-auto max-w-[860px] [&_h4]:mb-2 [&_h4]:text-xs [&_h4]:font-medium [&_h4]:text-white/50 [&_a]:px-2.5 [&_a]:py-1 [&_a]:text-xs [&_a]:bg-white/[0.05] [&_a]:text-white/72 [&_a]:backdrop-blur-sm [&_a:hover]:bg-white/[0.1] [&_a]:border [&_a]:border-white/[0.05]"
          />
        </FadeIn>
      </div>
    </section>
  );
}
