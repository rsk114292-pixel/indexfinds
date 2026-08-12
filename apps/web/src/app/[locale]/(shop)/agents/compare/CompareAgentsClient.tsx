"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, Info, Scale, ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AGENT_PLATFORMS } from "@/lib/agent-platforms";
import PlatformLogoBadge from "@/components/platforms/PlatformLogoBadge";
import { usePlatformStore } from "@/stores/usePlatformStore";

const DEFAULT_COMPARE_KEYS = ["loongbuy", "kakobuy", "superbuy"];
const MAX_COMPARE_AGENTS = 3;

export default function CompareAgentsClient() {
  const t = useTranslations("agents");
  const locale = useLocale();
  const [selectedKeys, setSelectedKeys] = useState(DEFAULT_COMPARE_KEYS);
  const { platforms, platformKey, fetchPlatforms, setPlatform } =
    usePlatformStore();

  useEffect(() => {
    if (platforms.length === 0) void fetchPlatforms();
  }, [fetchPlatforms, platforms.length]);

  const selectedAgents = useMemo(
    () =>
      selectedKeys
        .map((key) => AGENT_PLATFORMS.find((agent) => agent.key === key))
        .filter((agent): agent is (typeof AGENT_PLATFORMS)[number] =>
          Boolean(agent),
        ),
    [selectedKeys],
  );

  const toggleAgent = (key: string) => {
    setSelectedKeys((current) => {
      if (current.includes(key)) return current.filter((item) => item !== key);
      if (current.length >= MAX_COMPARE_AGENTS) return current;
      return [...current, key];
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-secondary text-white">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/70">
            <Scale className="h-3.5 w-3.5 text-primary" />
            {t("compareEyebrow")}
          </span>
          <h1 className="mt-5 max-w-3xl text-3xl font-extrabold tracking-[-0.035em] md:text-5xl">
            {t("compareTitle")}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 md:text-base">
            {t("compareSubtitle")}
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8 md:py-12">
        <div className="rounded-2xl border border-border bg-white p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-foreground">
                {t("chooseToCompare")}
              </h2>
              <p className="mt-1 text-xs text-muted">
                {t("selectedCount", {
                  count: selectedKeys.length,
                  max: MAX_COMPARE_AGENTS,
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedKeys([])}
              className="inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-semibold text-primary hover:bg-primary/5 hover:underline"
            >
              {t("clearComparison")}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7">
            {AGENT_PLATFORMS.map((agent) => {
              const selected = selectedKeys.includes(agent.key);
              const disabled =
                !selected && selectedKeys.length >= MAX_COMPARE_AGENTS;
              const platform = platforms.find((item) => item.key === agent.key);
              return (
                <button
                  key={agent.key}
                  type="button"
                  onClick={() => toggleAgent(agent.key)}
                  disabled={disabled}
                  aria-pressed={selected}
                  className={`relative flex min-w-0 items-center gap-2 rounded-xl border p-2.5 text-left transition-colors ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  <PlatformLogoBadge
                    platformKey={agent.key}
                    name={agent.name}
                    logoUrl={platform?.logoUrl}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    imageClassName="h-8 w-8 rounded-lg object-contain"
                    labelClassName="text-[9px] font-bold"
                  />
                  <span className="truncate text-xs font-semibold text-foreground">
                    {agent.name}
                  </span>
                  {selected && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {selectedAgents.length > 0 ? (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-white">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b border-border bg-gray-50/80">
                  <th className="w-48 px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-muted">
                    {t("comparisonField")}
                  </th>
                  {selectedAgents.map((agent) => {
                    const platform = platforms.find(
                      (item) => item.key === agent.key,
                    );
                    return (
                      <th
                        key={agent.key}
                        className="min-w-44 px-5 py-4 text-left"
                      >
                        <div className="flex items-center gap-3">
                          <PlatformLogoBadge
                            platformKey={agent.key}
                            name={agent.name}
                            logoUrl={platform?.logoUrl}
                            className="flex h-10 w-10 items-center justify-center rounded-xl"
                            imageClassName="h-10 w-10 rounded-xl object-contain"
                            labelClassName="text-[10px] font-bold"
                          />
                          <div>
                            <div className="font-bold text-foreground">
                              {agent.name}
                            </div>
                            {platformKey === agent.key && (
                              <span className="text-[11px] font-semibold text-success">
                                {t("preferred")}
                              </span>
                            )}
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <ComparisonRow label={t("preferredAgent")}>
                  {selectedAgents.map((agent) => (
                    <button
                      key={agent.key}
                      type="button"
                      onClick={() => setPlatform(agent.key)}
                      className={`inline-flex min-h-11 items-center rounded-full px-3 py-2 text-xs font-semibold ${
                        platformKey === agent.key
                          ? "bg-success/10 text-success"
                          : "bg-gray-100 text-foreground hover:bg-primary/10 hover:text-primary"
                      }`}
                    >
                      {platformKey === agent.key
                        ? t("preferred")
                        : t("setPreferred")}
                    </button>
                  ))}
                </ComparisonRow>
                <ComparisonRow label={t("officialWebsite")}>
                  {selectedAgents.map((agent) => (
                    <a
                      key={agent.key}
                      href={agent.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      {t("visitOfficial")} <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </ComparisonRow>
                <ComparisonRow label={t("indexFindsGuide")}>
                  {selectedAgents.map((agent) => (
                    <Link
                      key={agent.key}
                      href={`/agents/${agent.key}`}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      {t("openGuide")}
                    </Link>
                  ))}
                </ComparisonRow>
                <ComparisonRow label={t("serviceFees")}>
                  {selectedAgents.map((agent) => (
                    <ComparisonValue key={agent.key}>
                      {platforms.find((item) => item.key === agent.key)
                        ?.comparisonData?.serviceFee || t("confirmOfficial")}
                    </ComparisonValue>
                  ))}
                </ComparisonRow>
                <ComparisonRow label={t("shippingCoverage")}>
                  {selectedAgents.map((agent) => (
                    <ComparisonValue key={agent.key}>
                      {platforms.find((item) => item.key === agent.key)
                        ?.comparisonData?.shippingCoverage ||
                        t("variesByRoute")}
                    </ComparisonValue>
                  ))}
                </ComparisonRow>
                <ComparisonRow label={t("warehouseQc")}>
                  {selectedAgents.map((agent) => {
                    const data = platforms.find(
                      (item) => item.key === agent.key,
                    )?.comparisonData;
                    const values = [
                      typeof data?.freeStorageDays === "number"
                        ? t("freeStorageDaysValue", {
                            count: data.freeStorageDays,
                          })
                        : null,
                      data?.qcService,
                    ].filter(Boolean);
                    return (
                      <ComparisonValue key={agent.key}>
                        {values.length > 0
                          ? values.join(" · ")
                          : t("confirmOfficial")}
                      </ComparisonValue>
                    );
                  })}
                </ComparisonRow>
                <ComparisonRow label={t("paymentMethods")}>
                  {selectedAgents.map((agent) => (
                    <ComparisonValue key={agent.key}>
                      {platforms.find((item) => item.key === agent.key)
                        ?.comparisonData?.paymentMethods ||
                        t("confirmOfficial")}
                    </ComparisonValue>
                  ))}
                </ComparisonRow>
                <ComparisonRow label={t("returnPolicy")}>
                  {selectedAgents.map((agent) => (
                    <ComparisonValue key={agent.key}>
                      {platforms.find((item) => item.key === agent.key)
                        ?.comparisonData?.returnPolicy || t("confirmOfficial")}
                    </ComparisonValue>
                  ))}
                </ComparisonRow>
                <ComparisonRow label={t("dataUpdated")}>
                  {selectedAgents.map((agent) => {
                    const data = platforms.find(
                      (item) => item.key === agent.key,
                    )?.comparisonData;
                    const date = data?.dataUpdatedAt
                      ? new Intl.DateTimeFormat(locale, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }).format(new Date(`${data.dataUpdatedAt}T00:00:00`))
                      : null;
                    return (
                      <ComparisonValue key={agent.key}>
                        {date || t("notConfigured")}
                      </ComparisonValue>
                    );
                  })}
                </ComparisonRow>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted">
            {t("noAgentSelected")}
          </div>
        )}

        <div className="mt-6 flex gap-3 rounded-2xl border border-brand-indigo/15 bg-brand-indigo/5 p-4 text-sm text-muted">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-indigo" />
          <div>
            <p className="font-semibold text-foreground">
              {t("comparisonNoticeTitle")}
            </p>
            <p className="mt-1 leading-6">{t("comparisonNoticeBody")}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ComparisonRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode[];
}) {
  return (
    <tr>
      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 text-muted" />
          {label}
        </span>
      </th>
      {children.map((child, index) => (
        <td key={index} className="px-5 py-4 align-middle">
          {child}
        </td>
      ))}
    </tr>
  );
}

function ComparisonValue({ children }: { children: React.ReactNode }) {
  return <span className="text-xs leading-5 text-muted">{children}</span>;
}
