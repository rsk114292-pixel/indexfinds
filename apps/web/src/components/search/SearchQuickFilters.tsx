"use client";

import { Layers3, Tags } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { CategoryFacetItem } from "@/components/filters/types";

interface QuickFilterBrand {
  name: string;
  slug: string;
  count: number;
}

interface SearchQuickFiltersProps {
  categories?: CategoryFacetItem[];
  brands?: QuickFilterBrand[];
  variant?: "desktop" | "mobile";
  className?: string;
}

export default function SearchQuickFilters({
  categories = [],
  brands = [],
  variant = "desktop",
  className,
}: SearchQuickFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("search");

  const shortcuts = [
    ...categories.slice(0, 4).map((category) => ({
      key: "categories" as const,
      value: category.slug,
      label: category.translations?.[locale]?.name || category.name,
      count: category.count,
      icon: Layers3,
    })),
    ...brands.slice(0, 4).map((brand) => ({
      key: "brands" as const,
      value: brand.slug,
      label: brand.name,
      count: brand.count,
      icon: Tags,
    })),
  ];

  if (shortcuts.length === 0) return null;

  const toggleFilter = (key: "categories" | "brands", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const selected = new Set(params.get(key)?.split(",").filter(Boolean) || []);

    if (selected.has(value)) selected.delete(value);
    else selected.add(value);

    if (selected.size > 0) params.set(key, Array.from(selected).join(","));
    else params.delete(key);

    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <section
      aria-label={t("quickFilters")}
      className={cn(
        variant === "mobile"
          ? "border-b border-border/70 bg-surface py-2"
          : "rounded-2xl border border-border/80 bg-white px-4 py-3 shadow-sm",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2",
          variant === "mobile"
            ? "overflow-x-auto px-4 scrollbar-hide"
            : "flex-wrap",
        )}
      >
        <span className="shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-muted">
          {t("quickFilters")}
        </span>
        {shortcuts.map((shortcut) => {
          const values = searchParams.get(shortcut.key)?.split(",") || [];
          const selected = values.includes(shortcut.value);
          const Icon = shortcut.icon;

          return (
            <button
              key={`${shortcut.key}-${shortcut.value}`}
              type="button"
              aria-pressed={selected}
              aria-label={t("filterBy", { value: shortcut.label })}
              onClick={() => toggleFilter(shortcut.key, shortcut.value)}
              className={cn(
                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors",
                selected
                  ? "border-primary/30 bg-primary text-white shadow-sm"
                  : "border-border bg-gray-50 text-foreground hover:border-primary/30 hover:bg-primary/[0.06] hover:text-primary",
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{shortcut.label}</span>
              <span className={selected ? "text-white/75" : "text-muted"}>
                {shortcut.count}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
