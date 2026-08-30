"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Camera, Crown, ShieldCheck } from "lucide-react";
import SearchBox from "@/components/SearchBox";
import PlatformSelector from "@/components/PlatformSelector";
import HotSearches from "@/components/HotSearches";
import { FadeIn } from "@/components/ui/FadeIn";
import { useHeaderStore } from "@/stores/useHeaderStore";
import StarField from "@/components/home/StarField";
import { useTenant } from "@/components/TenantProvider";
import { getTenantHeroVisual } from "@/lib/tenant-hero";

interface HotSearchItem {
  keyword: string;
  count: number;
}

interface HeroSectionProps {
  initialHotSearches?: HotSearchItem[];
}

export default function HeroSection({
  initialHotSearches,
}: HeroSectionProps) {
  const t = useTranslations("home");
  const tenant = useTenant();
  const branding = tenant?.branding;
  const tenantHero = getTenantHeroVisual(tenant?.domain);
  const searchRef = useRef<HTMLDivElement>(null);
  const setHeroSearchVisible = useHeaderStore((s) => s.setHeroSearchVisible);

  const capabilityItems = [
    { icon: Sparkles, label: t("hero.featureAI") },
    { icon: Camera, label: t("hero.featureVisualSearch") },
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

  if (tenantHero && branding) {
    return (
      <section
        className="relative z-10 min-h-[calc(100svh-64px)] overflow-hidden text-white"
        style={{
          backgroundColor: tenantHero.backgroundColor,
          backgroundImage: `radial-gradient(ellipse at 50% 72%, ${tenantHero.accentColor}2b 0%, transparent 52%), linear-gradient(145deg, #07090d 0%, ${tenantHero.backgroundColor} 58%, #11151c 100%)`,
        }}
      >
        <div className="container relative mx-auto flex min-h-[calc(100svh-64px)] items-center px-4 py-14 md:py-16">
          <div className="mx-auto w-full max-w-[1220px] text-center">
            {tenant?.domain !== "itaobuyindex.com" && (
              <div className="mb-5 flex items-center justify-center gap-3 text-sm font-bold text-white/78">
                {!tenant?.domain.startsWith("ydaexpress.") && (
                  <img
                    src={branding.logoPath}
                    alt={`${branding.siteName} icon`}
                    className="h-10 w-10 rounded-xl bg-white object-contain p-1.5 shadow-[0_10px_28px_rgba(4,31,43,0.22)]"
                  />
                )}
                <span>{branding.heroEyebrow}</span>
              </div>
            )}
            <h1 className="mx-auto max-w-[1120px] text-4xl font-extrabold leading-[1.02] tracking-[-0.05em] sm:text-5xl lg:text-[58px]">
              <span className="block">{branding.heroPrimary}</span>
              <span
                className="mt-1 block"
                style={{ color: tenantHero.accentColor }}
              >
                {branding.heroSecondary}
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-[760px] text-base leading-7 text-white/76 sm:text-lg">
              {branding.supportingLine}
            </p>
            <div
              ref={searchRef}
              className={`mx-auto w-full max-w-[1120px] ${
                tenant?.domain === "bbdbuyeusheet.com" ||
                tenant?.domain === "bbdbuyeufinds.com" ||
                 tenant?.domain === "bbdbuyeus.com" ||
                 tenant?.domain === "boonbuyfind.net" ||
                 tenant?.domain === "cnshopperindex.com" ||
                 tenant?.domain === "eastmallbuyindex.com" ||
                 tenant?.domain === "fishgooindex.com" ||
                 tenant?.domain === "goatedbuyindex.com" ||
                 tenant?.domain === "gtbuyindex.com" ||
                 tenant?.domain === "hipobuyindex.com" ||
                 tenant?.domain === "hoobuyindex.net" ||
                  tenant?.domain === "itaobuyindex.com" ||
                tenant?.domain === "allchinabuyindex.com" ||
                tenant?.domain === "allchinabuyfinder.com" ||
                tenant?.domain === "cssbuycatalog.com" ||
                tenant?.domain === "cssbuyindex.com" ||
                tenant?.domain === "cssbuyitems.com" ||
                tenant?.domain === "kakobuyindex.net" ||
                tenant?.domain === "kakobuyitems.com" ||
                tenant?.domain === "litbuyindex.com" ||
                tenant?.domain === "litbuyitems.com" ||
                tenant?.domain === "litbuyproducts.com" ||
                tenant?.domain === "loongbuys.net" ||
                tenant?.domain === "lovegobuyindex.com" ||
                tenant?.domain === "mulebuyindex.net" ||
                tenant?.domain === "mulebuyitems.com" ||
                tenant?.domain === "oopbuyindex.net" ||
                tenant?.domain === "orientdigindex.com" ||
                tenant?.domain === "parcelupindex.com" ||
                tenant?.domain === "sugargooindex.net" ||
                tenant?.domain === "superbuydeals.com" ||
                tenant?.domain === "superbuyindex.com" ||
                tenant?.domain === "superbuyitems.com" ||
                tenant?.domain === "ydaexpress.net" ||
                tenant?.domain === "ydaexpress.org"
                  ? "mt-6"
                  : "mt-8"
              }`}
            >
              <SearchBox
                size="large"
                theme={
                  tenant?.domain === "bbdbuyeusheet.com"
                    ? "amber"
                    : tenant?.domain === "bbdbuyeufinds.com"
                    ? "cyan"
                    : tenant?.domain === "bbdbuyeus.com"
                    ? "amber"
                     : tenant?.domain === "boonbuyfind.net"
                     ? "amber"
                     : tenant?.domain === "cnshopperindex.com"
                     ? "amber"
                     : tenant?.domain === "eastmallbuyindex.com"
                     ? "amber"
                     : tenant?.domain === "fishgooindex.com"
                     ? "cyan"
                     : tenant?.domain === "goatedbuyindex.com"
                     ? "rose"
                     : tenant?.domain === "gtbuyindex.com"
                     ? "amber"
                     : tenant?.domain === "hipobuyindex.com"
                     ? "violet"
                     : tenant?.domain === "hoobuyindex.net"
                     ? "amber"
                     : tenant?.domain === "itaobuyindex.com"
                     ? "amber"
                      : tenant?.domain === "cssbuyindex.com"
                    ? "lime"
                    : tenant?.domain === "cssbuyitems.com"
                      ? "lime"
                    : tenant?.domain === "cssbuycatalog.com"
                      ? "cyan"
                      : tenant?.domain === "kakobuyindex.net" ||
                          tenant?.domain === "kakobuyitems.com"
                        ? "rose"
                      : tenant?.domain === "litbuyproducts.com"
                        ? "cyan"
                      : tenant?.domain === "litbuyindex.com" ||
                          tenant?.domain === "litbuyitems.com"
                        ? "amber"
                        : tenant?.domain === "loongbuys.net"
                          ? "amber"
                        : tenant?.domain === "lovegobuyindex.com"
                          ? "rose"
                        : tenant?.domain === "mulebuyindex.net"
                          ? "violet"
                        : tenant?.domain === "mulebuyitems.com"
                          ? "violet"
                        : tenant?.domain === "oopbuyindex.net"
                          ? "cyan"
                        : tenant?.domain === "orientdigindex.com"
                          ? "amber"
                        : tenant?.domain === "parcelupindex.com"
                          ? "amber"
                        : tenant?.domain === "sugargooindex.net"
                          ? "amber"
                        : tenant?.domain === "superbuydeals.com"
                          ? "rose"
                        : tenant?.domain === "superbuyindex.com"
                          ? "amber"
                        : tenant?.domain === "superbuyitems.com"
                          ? "blue"
                        : tenant?.domain === "ydaexpress.org"
                          ? "amber"
                      : "emerald"
                }
              />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="home-hero-shell relative z-10 flex min-h-[calc(100svh-64px)] flex-col justify-center overflow-visible"
      style={{
        background: branding
          ? "radial-gradient(ellipse at 50% 72%, color-mix(in srgb, var(--color-primary) 18%, transparent) 0%, transparent 52%), linear-gradient(145deg, #07090d 0%, #0c1017 58%, #11151c 100%)"
          : "radial-gradient(ellipse at 16% 84%, rgba(37, 99, 235, 0.26) 0%, transparent 42%), radial-gradient(ellipse at 84% 12%, rgba(126, 52, 176, 0.3) 0%, transparent 43%), linear-gradient(145deg, #030712 0%, #080d28 48%, #1b0d32 100%)",
      }}
    >
      <div className="absolute inset-0 overflow-hidden">
        {!branding && (
          <>
            <div
              className="absolute -right-1/4 -top-1/4 h-[600px] w-[600px] rounded-full opacity-30 blur-[120px] animate-[drift_12s_ease-in-out_infinite]"
              style={{
                background:
                  "radial-gradient(circle, #7C3AED 0%, transparent 70%)",
              }}
            />
            <div
              className="absolute -bottom-1/4 -left-1/4 h-[500px] w-[500px] rounded-full opacity-20 blur-[100px] animate-[drift_10s_ease-in-out_infinite_reverse]"
              style={{
                background:
                  "radial-gradient(circle, #2563EB 0%, transparent 70%)",
              }}
            />
            <div
              className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10 blur-[140px] animate-[drift_14s_ease-in-out_infinite]"
              style={{
                background:
                  "radial-gradient(circle, #A855F7 0%, transparent 70%)",
              }}
            />
            <StarField />
          </>
        )}
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-[#080b20]/45"
      />

      {/* Main Content */}
      <div className="home-hero-content relative z-10 container mx-auto px-4 py-10 sm:py-12 md:py-14 lg:py-16">
        <FadeIn direction="down" duration={0.45}>
          <div className="home-hero-eyebrow mb-4 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-white/75 backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              {branding?.heroEyebrow || t("hero.eyebrow")}
            </span>
          </div>
        </FadeIn>

        {/* Headline */}
        <FadeIn direction="down" duration={0.6}>
          <h1
            className={`home-hero-headline mx-auto mb-5 text-center font-bold leading-[1.03] tracking-[-0.05em] ${
              branding
                ? "max-w-[1220px] text-4xl sm:text-5xl lg:text-[54px] xl:text-[60px]"
                : "max-w-[1280px] text-4xl sm:text-5xl md:text-6xl lg:text-[68px] xl:text-[78px]"
            }`}
          >
              <span className="text-white">
                {branding?.heroPrimary || t("hero.headlinePrimary")}
              </span>
              <br />
              {" "}
              <span
                className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent"
              style={{
                backgroundSize: "200% auto",
                animation: "shimmer 4s linear infinite",
              }}
            >
              {branding?.heroSecondary || t("hero.headlineSecondary")}
            </span>
          </h1>
        </FadeIn>

        <FadeIn direction="up" duration={0.5} delay={0.15}>
          <p className="home-hero-description mx-auto mb-8 max-w-3xl text-center text-sm leading-relaxed text-white/72 sm:text-base md:text-lg">
            {branding ? (
              branding.supportingLine
            ) : (
              <>
                {t("hero.descLine1")}
                <br className="hidden md:block" /> {t("hero.descLine2")}
              </>
            )}
          </p>
        </FadeIn>

        {/* Search */}
        <FadeIn direction="up" duration={0.5} delay={0.25}>
          <div
            ref={searchRef}
            className="relative mx-auto mb-4 w-full max-w-[1120px]"
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
          <div className="home-hero-capabilities mx-auto mb-4 flex max-w-[960px] flex-wrap justify-center gap-2">
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
          <div className="home-hero-agent mx-auto mb-5 flex max-w-[960px] items-center justify-center gap-3">
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
