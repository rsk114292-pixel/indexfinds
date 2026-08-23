"use client";

import { useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ExternalLink,
  PackageSearch,
  Search,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AgentPlatformDefinition } from "@/lib/agent-platforms";
import PlatformLogoBadge from "@/components/platforms/PlatformLogoBadge";
import { usePlatformStore } from "@/stores/usePlatformStore";
import { rememberRecentPlatform } from "@/lib/platform-recents";
import {
  getSubsiteCatalogUrl,
  getSubsiteGuidesForAgent,
} from "@/lib/subsite-guides";

export default function AgentDetailClient({
  agent,
}: {
  agent: AgentPlatformDefinition;
}) {
  const t = useTranslations("agents");
  const { platforms, platformKey, setPlatform, fetchPlatforms } =
    usePlatformStore();
  const platform = platforms.find((item) => item.key === agent.key);
  const selected = platformKey === agent.key;
  const relatedGuides = getSubsiteGuidesForAgent(agent.key);

  useEffect(() => {
    if (platforms.length === 0) void fetchPlatforms();
  }, [fetchPlatforms, platforms.length]);

  const chooseAgent = () => {
    setPlatform(agent.key);
    rememberRecentPlatform(agent.key);
  };

  const steps = [
    { icon: Search, title: t("stepSearchTitle"), body: t("stepSearchBody") },
    {
      icon: PackageSearch,
      title: t("stepReviewTitle"),
      body: t("stepReviewBody"),
    },
    {
      icon: ShoppingBag,
      title: t("stepChooseTitle", { name: agent.name }),
      body: t("stepChooseBody"),
    },
    {
      icon: ExternalLink,
      title: t("stepContinueTitle"),
      body: t("stepContinueBody"),
    },
  ];

  return (
    <div>
      <section className="bg-secondary text-white">
        <div className="container mx-auto px-4 py-10 md:py-16">
          <Link
            href="/agents"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/55 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("allGuides")}
          </Link>
          <div className="mt-8 grid items-center gap-8 md:grid-cols-[1fr_auto]">
            <div className="flex min-w-0 items-start gap-5">
              <PlatformLogoBadge
                platformKey={agent.key}
                name={agent.name}
                logoUrl={platform?.logoUrl}
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl"
                imageClassName="h-20 w-20 shrink-0 rounded-2xl bg-white object-contain p-1"
                labelClassName="text-lg font-bold"
              />
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                  {t("guideEyebrow")}
                </span>
                <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.035em] md:text-5xl">
                  {t("guideTitle", { name: agent.name })}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60 md:text-base">
                  {t("guideSubtitle", { name: agent.name })}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row md:flex-col">
              <button
                type="button"
                onClick={chooseAgent}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white"
              >
                {selected ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <ShoppingBag className="h-4 w-4" />
                )}
                {selected
                  ? t("selectedAgent")
                  : t("useAsAgent", { name: agent.name })}
              </button>
              <a
                href={agent.officialUrl}
                target="_blank"
                  rel="sponsored nofollow noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-5 text-sm font-semibold text-white/80"
              >
                {t("officialWebsite")}
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              {t("howToTitle", { name: agent.name })}
            </h2>
            <p className="mt-2 text-sm text-muted">{t("howToSubtitle")}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.title}
                  className="rounded-2xl border border-border bg-white p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-extrabold text-muted/50">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-base font-bold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {step.body}
                  </p>
                </article>
              );
            })}
          </div>

          {relatedGuides.length > 0 ? (
            <div className="mt-8 rounded-2xl border border-border bg-white p-6 md:p-8">
              <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
                <BookOpen className="h-5 w-5 text-primary" />
                {t("allGuides")}
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {relatedGuides.map((guide) => (
                  <a
                    key={guide.domain}
                    href={getSubsiteCatalogUrl(guide)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 hover:border-primary/30"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-foreground">
                        {guide.title}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {guide.domain}
                      </span>
                    </span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-primary" />
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-8 grid gap-5 rounded-2xl border border-border bg-gray-50 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
            <div className="flex gap-4">
              <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-brand-indigo" />
              <div>
                <h3 className="font-bold text-foreground">
                  {t("disclosureTitle")}
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {t("disclosureBody")}
                </p>
              </div>
            </div>
            <Link
              href={`/products?agent=${encodeURIComponent(agent.key)}`}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-secondary px-5 text-sm font-semibold text-white"
            >
              {t("browseProducts")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
