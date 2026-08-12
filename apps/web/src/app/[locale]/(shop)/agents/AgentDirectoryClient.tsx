"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Scale,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AGENT_PLATFORMS } from "@/lib/agent-platforms";
import PlatformLogoBadge from "@/components/platforms/PlatformLogoBadge";
import { usePlatformStore } from "@/stores/usePlatformStore";
import { countConfiguredComparisonFields } from "@/lib/agent-recommendation";
import AgentMatchWizard from "./AgentMatchWizard";

export default function AgentDirectoryClient() {
  const t = useTranslations("agents");
  const [query, setQuery] = useState("");
  const { platforms, fetchPlatforms } = usePlatformStore();

  useEffect(() => {
    if (platforms.length === 0) void fetchPlatforms();
  }, [fetchPlatforms, platforms.length]);

  const filteredAgents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return AGENT_PLATFORMS;
    return AGENT_PLATFORMS.filter((agent) =>
      agent.name.toLowerCase().includes(normalizedQuery),
    );
  }, [query]);

  return (
    <div className="bg-background">
      <section className="relative overflow-hidden bg-secondary text-white">
        <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full bg-primary/25 blur-[100px]" />
        <div className="absolute -bottom-36 left-1/4 h-72 w-72 rounded-full bg-brand-indigo/20 blur-[110px]" />
        <div className="container relative mx-auto px-4 py-14 md:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/70">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            {t("eyebrow")}
          </span>
          <h1 className="mt-5 max-w-3xl text-3xl font-extrabold tracking-[-0.035em] md:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 md:text-base">
            {t("subtitle", { count: AGENT_PLATFORMS.length })}
          </p>
          <Link
            href="/agents/compare"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-primary! px-4 text-sm font-semibold text-white!"
          >
            <Scale className="h-4 w-4" />
            {t("compareAgents")}
          </Link>
          <label className="mt-7 flex h-12 max-w-xl items-center gap-3 rounded-full border border-white/10 bg-white/[0.08] px-4 backdrop-blur-sm focus-within:border-primary/60">
            <Search className="h-4 w-4 text-white/50" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
            />
          </label>
        </div>
      </section>

      <AgentMatchWizard />

      <section className="container mx-auto px-4 py-10 md:py-14">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {t("supportedTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted">{t("supportedDesc")}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("officialLogos")}
          </span>
        </div>

        {filteredAgents.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredAgents.map((agent) => {
              const platform = platforms.find((item) => item.key === agent.key);
              const configuredFields = countConfiguredComparisonFields(
                platform?.comparisonData,
              );
              return (
                <Link
                  key={agent.key}
                  href={`/agents/${agent.key}`}
                  className="group flex min-w-0 flex-col rounded-2xl border border-border bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg"
                >
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <PlatformLogoBadge
                      platformKey={agent.key}
                      name={agent.name}
                      logoUrl={platform?.logoUrl}
                      className="flex h-12 w-12 items-center justify-center rounded-xl"
                      imageClassName="h-12 w-12 rounded-xl object-contain"
                      labelClassName="text-xs font-bold"
                    />
                    <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </div>
                  <h3 className="truncate text-base font-bold text-foreground">
                    {agent.name}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {t("cardDescription", { name: agent.name })}
                  </p>
                  <span
                    className={`mt-3 inline-flex w-fit rounded-full px-2 py-1 text-[10px] font-semibold ${
                      configuredFields > 0
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-muted"
                    }`}
                  >
                    {configuredFields > 0
                      ? t("configuredFields", { count: configuredFields })
                      : t("notConfigured")}
                  </span>
                  <span className="mt-4 text-xs font-semibold text-primary">
                    {t("openGuide")}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted">
            {t("noResults")}
          </div>
        )}
      </section>
    </div>
  );
}
