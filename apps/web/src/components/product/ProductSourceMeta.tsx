"use client";

import {
  AlertTriangle,
  Clock3,
  ExternalLink,
  Eye,
  Flag,
  PackageCheck,
  Store,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { buildWhatsAppHelpUrl } from "@/lib/support-links";

interface ProductSourceMetaProps {
  sourceUrl?: string | null;
  shopName?: string | null;
  viewCount?: number | null;
  salesCount?: number | null;
  updatedAt?: string | null;
  productId?: string | null;
  productTitle?: string | null;
  compact?: boolean;
}

function getSourceName(sourceUrl?: string | null): string | null {
  if (!sourceUrl) return null;
  try {
    const hostname = new URL(sourceUrl).hostname.replace(/^www\./, "");
    if (hostname.includes("weidian")) return "Weidian";
    if (hostname.includes("taobao")) return "Taobao";
    if (hostname.includes("1688")) return "1688";
    return hostname;
  } catch {
    return null;
  }
}

export default function ProductSourceMeta({
  sourceUrl,
  shopName,
  viewCount,
  salesCount,
  updatedAt,
  productId,
  productTitle,
  compact = false,
}: ProductSourceMetaProps) {
  const t = useTranslations("product");
  const locale = useLocale();
  const sourceName = getSourceName(sourceUrl);
  const updatedDate = updatedAt ? new Date(updatedAt) : null;
  const updatedLabel =
    updatedDate && !Number.isNaN(updatedDate.getTime())
      ? new Intl.DateTimeFormat(locale, {
          year: "numeric",
          month: "short",
          day: "numeric",
          // Keep the server-rendered date identical to the hydrated client.
          // Vercel renders in UTC while a visitor's browser may use another
          // timezone, which can otherwise move late-night timestamps forward
          // or backward by one calendar day during hydration.
          timeZone: "UTC",
        }).format(updatedDate)
      : null;
  const reportUrl = buildWhatsAppHelpUrl(
    [
      "Hello IndexFinds, I want to report a product issue.",
      productTitle ? `Product: ${productTitle}` : null,
      productId ? `Product ID: ${productId}` : null,
      sourceUrl ? `Source: ${sourceUrl}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-gray-50/70 text-muted ${
        compact ? "px-3 py-2.5 text-[11px]" : "px-4 py-3 text-xs"
      }`}
    >
      {sourceName && sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary hover:underline"
        >
          <Store className="h-3.5 w-3.5" />
          {t("originalSource", { source: sourceName })}
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
      {!sourceName && (
        <span className="inline-flex items-center gap-1.5 font-semibold text-red-700">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          {t("sourceMissing")}
        </span>
      )}
      {shopName && (
        <span className="inline-flex items-center gap-1.5">
          <Store className="h-3.5 w-3.5" /> {shopName}
        </span>
      )}
      {typeof viewCount === "number" && viewCount > 0 && (
        <span className="inline-flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5" />{" "}
          {t("viewsValue", { count: viewCount })}
        </span>
      )}
      {typeof salesCount === "number" && salesCount > 0 && (
        <span className="inline-flex items-center gap-1.5">
          <PackageCheck className="h-3.5 w-3.5" />{" "}
          {t("salesValue", { count: salesCount })}
        </span>
      )}
      {updatedLabel && (
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="h-3.5 w-3.5" />{" "}
          {t("updatedValue", { date: updatedLabel })}
        </span>
      )}
      {sourceName && (
        <span className="inline-flex items-center gap-1.5 text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          {t("sourceStatusUnverified")}
        </span>
      )}
      <a
        href={reportUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-foreground hover:text-primary hover:underline"
      >
        <Flag className="h-3.5 w-3.5" aria-hidden="true" />
        {t("reportProduct")}
      </a>
    </div>
  );
}
