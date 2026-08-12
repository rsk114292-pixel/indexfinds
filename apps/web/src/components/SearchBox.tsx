"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import dynamic from "next/dynamic";
import { Search, Clock, Link2, X } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { fetchSearchSuggestions, type SearchSuggestions } from "@/lib/search";
import { useCategoryLabelResolver } from "@/hooks/useCategoryLabelResolver";
import { useTranslations, useLocale } from "next-intl";
import { getImageReferrerPolicy, getImageVariant } from "@/lib/image-utils";
import {
  getSearchHistory as loadSearchHistory,
  saveSearchHistory,
  removeSearchHistoryItem,
  clearSearchHistory,
} from "@/lib/search-history";
import { useSearchParams } from "next/navigation";
import { buildReturnTo, withReturnTo } from "@/lib/return-to";
import { saveReturnScroll } from "@/lib/return-scroll";
import { usePersonalizedHotSearches } from "@/hooks/usePersonalizedHotSearches";
import { extractProductLinkSearchTerm } from "@/lib/product-link";

const LazyImageSearchUploader = dynamic(
  () => import("./LazyImageSearchUploader"),
  { ssr: false },
);

interface SearchBoxProps {
  size?: "default" | "large";
  mobileCompact?: boolean;
}

type SearchOptionType = "brand" | "category" | "product" | "history";

interface SearchOption {
  key: string;
  value: string;
  label: ReactNode;
  type: SearchOptionType;
  slug?: string;
}

interface SearchOptionGroup {
  key: string;
  label: ReactNode;
  options: SearchOption[];
}

export default function SearchBox({
  size = "default",
  mobileCompact = false,
}: SearchBoxProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("search");
  const tc = useTranslations("common");
  const th = useTranslations("header");
  const locale = useLocale();
  const { getCategoryLabel } = useCategoryLabelResolver();
  const rootRef = useRef<HTMLDivElement>(null);
  const returnTo = useMemo(
    () => buildReturnTo(pathname, searchParams),
    [pathname, searchParams],
  );
  const [searchValue, setSearchValue] = useState("");
  const [searchMode, setSearchMode] = useState<"keyword" | "link">("keyword");
  const [linkError, setLinkError] = useState("");
  const [options, setOptions] = useState<SearchOptionGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [shouldLoadHotSearches, setShouldLoadHotSearches] = useState(false);
  const hasSearchValue = searchValue.trim().length > 0;

  const { items: hotSearches } = usePersonalizedHotSearches({
    enabled: shouldLoadHotSearches,
    limit: 3,
  });

  const [searchHistory, setSearchHistory] = useState<string[]>(() =>
    loadSearchHistory(),
  );
  const debouncedSearchValue = useDebounce(searchValue, 300);

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  const rankBadgeClass = (index: number) => {
    const colors = [
      "bg-red-500 text-white",
      "bg-orange-500 text-white",
      "bg-amber-400 text-white",
    ];
    return colors[index] || "bg-gray-200 text-gray-500";
  };

  const removeFromHistory = useCallback((query: string) => {
    setSearchHistory(removeSearchHistoryItem(query));
  }, []);

  const clearAllHistory = useCallback(() => {
    clearSearchHistory();
    setSearchHistory([]);
  }, []);

  const defaultOptions = useMemo<SearchOptionGroup[]>(() => {
    const groups: SearchOptionGroup[] = [];
    const hotKeywords = new Set<string>();

    if (hotSearches?.length) {
      hotSearches.forEach((item) => hotKeywords.add(item.keyword));
      groups.push({
        key: "hot",
        label: <span className="font-semibold">{t("hotSearches")}</span>,
        options: hotSearches.map((item, index) => ({
          key: `hot_${item.keyword}`,
          value: item.keyword,
          type: "history",
          label: (
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded text-xs font-bold ${rankBadgeClass(index)}`}
              >
                {index + 1}
              </span>
              <span className={index === 0 ? "font-semibold" : ""}>
                {item.keyword}
              </span>
            </div>
          ),
        })),
      });
    }

    const filteredHistory = searchHistory
      .filter((query) => !hotKeywords.has(query))
      .slice(0, 5);
    if (filteredHistory.length) {
      groups.push({
        key: "history",
        label: (
          <div className="flex items-center justify-between gap-4">
            <span className="font-semibold">{t("searchHistory")}</span>
            <button
              type="button"
              className="text-xs font-medium text-gray-400 transition-colors hover:text-red-500"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                clearAllHistory();
              }}
            >
              {tc("clearAll")}
            </button>
          </div>
        ),
        options: filteredHistory.map((query) => ({
          key: `history_${query}`,
          value: query,
          type: "history",
          label: (
            <div className="group/item flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Clock className="h-3.5 w-3.5 shrink-0 opacity-45" />
                <span className="truncate">{query}</span>
              </div>
              <button
                type="button"
                className="rounded p-0.5 opacity-0 transition-all group-hover/item:opacity-100 hover:text-red-500"
                aria-label={`${tc("clearAll")}: ${query}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  removeFromHistory(query);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ),
        })),
      });
    }

    return groups;
  }, [clearAllHistory, hotSearches, removeFromHistory, searchHistory, t, tc]);

  const formatSuggestions = useCallback(
    (data: SearchSuggestions): SearchOptionGroup[] => {
      const groups: SearchOptionGroup[] = [];

      if (data.brands?.length) {
        groups.push({
          key: "brands",
          label: <span className="font-semibold">{t("brands")}</span>,
          options: data.brands.map((brand) => ({
            key: `brand_${brand.slug}`,
            value: brand.slug,
            slug: brand.slug,
            type: "brand",
            label: (
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{brand.name}</span>
                {brand.productCount !== undefined ? (
                  <span className="text-xs opacity-55">
                    {t("itemCount", { count: brand.productCount })}
                  </span>
                ) : null}
              </div>
            ),
          })),
        });
      }

      if (data.categories?.length) {
        groups.push({
          key: "categories",
          label: <span className="font-semibold">{t("categories")}</span>,
          options: data.categories.map((category) => ({
            key: `category_${category.slug}`,
            value: category.slug,
            slug: category.slug,
            type: "category",
            label: (
              <div className="flex items-center justify-between gap-3">
                <span>
                  <strong>
                    {getCategoryLabel(
                      category.slug,
                      locale === "zh"
                        ? category.chineseName || category.name
                        : category.name,
                    )}
                  </strong>{" "}
                  {locale === "zh"
                    ? category.chineseName !== category.name
                      ? category.name
                      : ""
                    : category.chineseName || ""}
                </span>
                {category.productCount !== undefined ? (
                  <span className="text-xs opacity-55">
                    {t("productCount", { count: category.productCount })}
                  </span>
                ) : null}
              </div>
            ),
          })),
        });
      }

      if (data.products?.length) {
        groups.push({
          key: "products",
          label: <span className="font-semibold">{t("products")}</span>,
          options: data.products.map((product) => ({
            key: `product_${product.slug}`,
            value: product.slug,
            slug: product.slug,
            type: "product",
            label: (
              <div className="flex items-center gap-2">
                {product.images?.[0] ? (
                  <img
                    src={getImageVariant(product.images[0], 80)}
                    alt=""
                    className="h-10 w-10 rounded object-cover"
                    referrerPolicy={getImageReferrerPolicy(
                      getImageVariant(product.images[0], 80),
                    )}
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{product.title}</div>
                  {product.chineseTitle ? (
                    <div className="truncate text-xs opacity-55">
                      {product.chineseTitle}
                    </div>
                  ) : null}
                </div>
              </div>
            ),
          })),
        });
      }

      return groups;
    },
    [getCategoryLabel, locale, t],
  );

  useEffect(() => {
    const controller = new AbortController();

    const loadSuggestions = async () => {
      if (searchMode === "link") {
        setOptions((current) => (current.length ? [] : current));
        setLoading(false);
        return;
      }

      if (!debouncedSearchValue || debouncedSearchValue.length < 2) {
        setOptions((current) => (current.length ? [] : current));
        setActiveIndex(-1);
        return;
      }

      setLoading(true);
      try {
        const data = await fetchSearchSuggestions(
          debouncedSearchValue,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setOptions(formatSuggestions(data));
        setActiveIndex(-1);
      } catch {
        if (!controller.signal.aborted) setOptions([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadSuggestions();
    return () => controller.abort();
  }, [debouncedSearchValue, formatSuggestions, searchMode]);

  const displayedOptions =
    searchMode === "keyword" && !debouncedSearchValue
      ? defaultOptions
      : options;

  const flattenedOptions = useMemo(
    () => displayedOptions.flatMap((group) => group.options),
    [displayedOptions],
  );

  const saveToHistory = (query: string) => {
    setSearchHistory(saveSearchHistory(query));
  };

  const handleSearch = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;

      if (searchMode === "link") {
        const productTerm = extractProductLinkSearchTerm(trimmed);
        if (!productTerm) {
          setLinkError(t("invalidProductLink"));
          return;
        }
        router.push(`/search?q=${encodeURIComponent(productTerm)}&source=link`);
      } else {
        saveToHistory(trimmed);
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      }

      setLinkError("");
      setSearchValue("");
      setOptions([]);
      setOpen(false);
    },
    [router, searchMode, t],
  );

  const handleSelect = useCallback(
    (option: SearchOption) => {
      const slug = option.slug || option.value;
      switch (option.type) {
        case "brand":
          router.push(`/search?q=${encodeURIComponent(slug)}&brands=${slug}`);
          break;
        case "category":
          router.push(`/categories/${slug}`);
          break;
        case "product":
          saveReturnScroll(returnTo);
          router.push(withReturnTo(`/products/${slug}`, returnTo));
          break;
        default:
          handleSearch(option.value);
          return;
      }
      setSearchValue("");
      setOptions([]);
      setOpen(false);
    },
    [handleSearch, returnTo, router],
  );

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (event.key === "ArrowDown" && flattenedOptions.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => (current + 1) % flattenedOptions.length);
      return;
    }
    if (event.key === "ArrowUp" && flattenedOptions.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) =>
        current <= 0 ? flattenedOptions.length - 1 : current - 1,
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (open && activeIndex >= 0 && flattenedOptions[activeIndex]) {
        handleSelect(flattenedOptions[activeIndex]);
      } else {
        handleSearch(searchValue);
      }
    }
  };

  const showSuggestions =
    open &&
    searchMode === "keyword" &&
    (displayedOptions.length > 0 ||
      loading ||
      debouncedSearchValue.length >= 2);
  const darkSuggestions = size === "large";

  const searchInput = (
    <div ref={rootRef} className="relative w-full">
      <div className="relative flex min-h-11 items-center">
        {searchMode === "link" ? (
          <Link2 className="pointer-events-none absolute left-4 h-4 w-4 text-white/55 rtl:left-auto rtl:right-4" />
        ) : (
          <Search className="pointer-events-none absolute left-4 h-4 w-4 text-white/55 rtl:left-auto rtl:right-4" />
        )}
        <input
          value={searchValue}
          onChange={(event) => {
            setSearchValue(event.target.value);
            setLinkError("");
            setOpen(true);
          }}
          onFocus={() => {
            setShouldLoadHotSearches(true);
            setOpen(true);
          }}
          onKeyDown={handleInputKeyDown}
          placeholder={
            searchMode === "link" ? t("linkPlaceholder") : t("placeholder")
          }
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-controls="search-suggestions"
          aria-activedescendant={
            activeIndex >= 0 ? `search-option-${activeIndex}` : undefined
          }
          className="h-11 w-full rounded-full border-0 bg-transparent py-2 pl-11 pr-4 text-sm font-medium text-white outline-none placeholder:text-white/45 rtl:pl-4 rtl:pr-11"
        />
      </div>

      {showSuggestions ? (
        <div
          id="search-suggestions"
          role="listbox"
          className={`absolute inset-x-0 top-[calc(100%+0.5rem)] z-[85] max-h-[400px] overflow-y-auto overscroll-contain rounded-2xl border p-2 text-left shadow-2xl rtl:text-right ${
            darkSuggestions
              ? "border-white/10 bg-[#11182e] text-slate-100"
              : "border-gray-100 bg-white text-foreground"
          }`}
        >
          {loading ? (
            <p className="px-3 py-6 text-center text-sm opacity-60">
              {t("searching")}
            </p>
          ) : displayedOptions.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm opacity-60">
              {t("noResults")}
            </p>
          ) : (
            displayedOptions.map((group) => (
              <section key={group.key} className="mb-2 last:mb-0">
                <div className="px-3 pb-1.5 pt-2 text-xs uppercase tracking-[0.08em] opacity-55">
                  {group.label}
                </div>
                <div>
                  {group.options.map((option) => {
                    const index = flattenedOptions.findIndex(
                      (candidate) => candidate.key === option.key,
                    );
                    return (
                      <button
                        key={option.key}
                        id={`search-option-${index}`}
                        type="button"
                        role="option"
                        aria-selected={activeIndex === index}
                        onMouseEnter={() => setActiveIndex(index)}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSelect(option)}
                        className={`block w-full rounded-xl px-3 py-2.5 text-sm transition-colors ${
                          activeIndex === index
                            ? darkSuggestions
                              ? "bg-white/10"
                              : "bg-gray-100"
                            : darkSuggestions
                              ? "hover:bg-white/[0.07]"
                              : "hover:bg-gray-50"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      ) : null}
    </div>
  );

  if (size === "large") {
    return (
      <div>
        {!mobileCompact ? (
          <div className="mb-2 flex justify-center gap-1 rounded-full p-1">
            <button
              type="button"
              onClick={() => {
                setSearchMode("keyword");
                setSearchValue("");
                setLinkError("");
              }}
              className={`inline-flex h-11 items-center gap-2 rounded-full px-4 text-xs font-semibold transition-colors ${
                searchMode === "keyword"
                  ? "bg-white/12 text-white"
                  : "text-white/60 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              {t("modeKeyword")}
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchMode("link");
                setSearchValue("");
                setOptions([]);
                setLinkError("");
              }}
              className={`inline-flex h-11 items-center gap-2 rounded-full px-4 text-xs font-semibold transition-colors ${
                searchMode === "link"
                  ? "bg-white/12 text-white"
                  : "text-white/60 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <Link2 className="h-3.5 w-3.5" />
              {t("modeLink")}
            </button>
            <LazyImageSearchUploader variant="tab" />
          </div>
        ) : null}

        <div className="hero-command-bar relative overflow-visible rounded-[30px] p-[1.5px] md:rounded-full">
          <div aria-hidden className="hero-command-ambient" />
          <div aria-hidden className="hero-command-rim" />
          <div className="hero-command-bar-panel flex flex-col gap-2 overflow-visible rounded-[28px] p-2 md:flex-row md:items-stretch md:rounded-full">
            <div className="hero-command-input min-w-0 flex-1 rounded-[22px] md:rounded-full">
              {searchInput}
            </div>
            <div className="flex shrink-0 items-center gap-2 md:pr-1">
              <button
                type="button"
                onClick={() => handleSearch(searchValue)}
                className="hero-command-search inline-flex h-11 min-w-[96px] items-center justify-center rounded-full px-5 text-sm font-semibold"
                disabled={!hasSearchValue}
              >
                {searchMode === "link" ? t("findFromLink") : th("search")}
              </button>
            </div>
          </div>
        </div>
        {linkError ? (
          <p className="mt-2 text-center text-xs font-medium text-red-300">
            {linkError}
          </p>
        ) : null}
        {mobileCompact ? (
          <div className="mt-2 flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSearchMode((current) =>
                  current === "link" ? "keyword" : "link",
                );
                setSearchValue("");
                setOptions([]);
                setLinkError("");
              }}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {searchMode === "link" ? (
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {searchMode === "link" ? t("modeKeyword") : t("modeLink")}
            </button>
            <LazyImageSearchUploader variant="tab" />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="header-command-bar flex w-full items-center gap-2 rounded-[26px] px-2 py-1.5">
      <div className="header-command-input min-w-0 flex-1 rounded-[22px]">
        {searchInput}
      </div>
      <button
        type="button"
        onClick={() => handleSearch(searchValue)}
        disabled={!hasSearchValue}
        className="header-command-search inline-flex h-10 min-w-[72px] items-center justify-center rounded-[20px] px-3.5 text-sm font-semibold xl:min-w-[84px] xl:px-4"
      >
        {th("search")}
      </button>
      <div
        className="hidden xl:block"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <LazyImageSearchUploader
          variant="icon"
          className="header-command-camera h-10 w-10 rounded-[20px] p-0"
        />
      </div>
    </div>
  );
}
