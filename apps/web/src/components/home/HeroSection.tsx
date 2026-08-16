"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Camera, Package, Crown, ShieldCheck } from "lucide-react";
import SearchBox from "@/components/SearchBox";
import PlatformSelector from "@/components/PlatformSelector";
import HotSearches from "@/components/HotSearches";
import { FadeIn } from "@/components/ui/FadeIn";
import { useHeaderStore } from "@/stores/useHeaderStore";
import StarField from "@/components/home/StarField";

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
}: HeroSectionProps) {
  const t = useTranslations("home");
  const searchRef = useRef<HTMLDivElement>(null);
  const setHeroSearchVisible = useHeaderStore((s) => s.setHeroSearchVisible);

  const capabilityItems = [
    { icon: Sparkles, label: t("hero.featureAI") },
    { icon: Camera, label: t("hero.featureVisualSearch") },
    { icon: Package, label: t("hero.browseProducts") },
    { icon: Crown, label: t("hero.compareAgents") },
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
    <section
      className="relative z-10 flex min-h-[calc(100svh-64px)] flex-col justify-center overflow-visible"
      style={{
        background:
          "radial-gradient(ellipse at 16% 84%, rgba(37, 99, 235, 0.26) 0%, transparent 42%), radial-gradient(ellipse at 84% 12%, rgba(126, 52, 176, 0.3) 0%, transparent 43%), linear-gradient(145deg, #030712 0%, #080d28 48%, #1b0d32 100%)",
      }}
    >
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Primary orb - top right */}
        <div
          className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full opacity-30 blur-[120px] animate-[drift_12s_ease-in-out_infinite]"
          style={{
            background: "radial-gradient(circle, #7C3AED 0%, transparent 70%)",
          }}
        />
        {/* Accent orb - bottom left */}
        <div
          className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] rounded-full opacity-20 blur-[100px] animate-[drift_10s_ease-in-out_infinite_reverse]"
          style={{
            background: "radial-gradient(circle, #2563EB 0%, transparent 70%)",
          }}
        />
        {/* Subtle secondary orb - center */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-10 blur-[140px] animate-[drift_14s_ease-in-out_infinite]"
          style={{
            background: "radial-gradient(circle, #A855F7 0%, transparent 70%)",
          }}
        />
        <StarField />
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-12 md:py-16 lg:py-20">
        <FadeIn direction="down" duration={0.45}>
          <div className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-white/75 backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              {t("hero.eyebrow")}
            </span>
          </div>
        </FadeIn>

        {/* Headline */}
        <FadeIn direction="down" duration={0.6}>
          <h1 className="mb-6 text-center text-4xl font-bold leading-[1.02] tracking-[-0.05em] sm:text-5xl md:text-6xl lg:text-7xl xl:text-[82px]">
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
          <p className="mx-auto mb-10 max-w-3xl text-center text-sm leading-relaxed text-white/60 sm:text-base md:text-lg">
            {t("hero.descLine1")}
            <br className="hidden md:block" />
            {t("hero.descLine2")}
          </p>
        </FadeIn>

        {/* Search */}
        <FadeIn direction="up" duration={0.5} delay={0.25}>
          <div
            ref={searchRef}
            className="relative mx-auto mb-5 w-full max-w-[1080px]"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 h-[190px] w-[940px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-80 blur-[88px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(129,140,248,0.18) 0%, rgba(255,122,78,0.18) 38%, transparent 74%)",
              }}
            />
            <SearchBox size="large" />
          </div>
        </FadeIn>

        <FadeIn direction="up" duration={0.35} delay={0.3}>
          <div className="mx-auto mb-5 flex max-w-[960px] flex-wrap justify-center gap-2">
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
          <div className="mx-auto mb-6 flex max-w-[960px] items-center justify-center gap-3">
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
            className="mx-auto max-w-[960px] [&>div]:justify-center [&_h2]:mb-2 [&_h2]:justify-center [&_h2]:text-xs [&_h2]:font-medium [&_h2]:text-white/50 [&_a]:px-3 [&_a]:py-1.5 [&_a]:text-xs [&_a]:bg-white/[0.05] [&_a]:text-white/72 [&_a]:backdrop-blur-sm [&_a:hover]:bg-white/[0.1] [&_a]:border [&_a]:border-white/[0.05]"
          />
        </FadeIn>
      </div>
    </section>
  );
}
