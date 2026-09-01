"use client";

import { useState, useEffect } from "react";
import { Search, Camera } from "lucide-react";
import { useTranslations } from "next-intl";

interface MobileSearchEntryProps {
  onTap?: (currentKeyword?: string) => void;
  onPhotoSearch?: () => void;
  query?: string;
  rotatingKeywords?: string[];
}

/**
 * 移动端搜索入口（假输入框）
 *
 * 点击搜索区域 → 展开 MobileSearchOverlay
 * 点击右侧 📷 → 触发搜图模式（在浮层内完成）
 * 规格：圆角 lg / 灰底 / 44px 高度
 */
export default function MobileSearchEntry({
  onTap,
  onPhotoSearch,
  query,
  rotatingKeywords,
}: MobileSearchEntryProps) {
  const t = useTranslations("header");
  const ts = useTranslations("search");
  const [currentIndex, setCurrentIndex] = useState(0);

  const hasKeywords = !query && rotatingKeywords && rotatingKeywords.length > 0;

  useEffect(() => {
    if (!hasKeywords) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % rotatingKeywords!.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [hasKeywords, rotatingKeywords]);

  const currentKeyword = hasKeywords
    ? rotatingKeywords![currentIndex]
    : undefined;
  const displayText = query || ts("entryHint");
  const isPlaceholder = !query;
  const openSearch = () => onTap?.(currentKeyword);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openSearch}
      onKeyDown={(e) => {
        if (e.key === "Enter") openSearch();
      }}
      className="flex h-12 w-full items-center gap-2 rounded-xl bg-[#f7f4ef] px-2.5 transition-colors duration-150 active:bg-[#f0ebe4] cursor-pointer"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden pl-1">
        <Search className="h-4.5 w-4.5 shrink-0 text-muted/90" />
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
          <span
            className={`truncate text-sm ${isPlaceholder ? "text-slate-600" : "text-foreground"}`}
          >
            {displayText}
          </span>
          {!query && currentKeyword && (
            <span
              key={currentIndex}
              className="max-w-[34vw] shrink-0 truncate rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 animate-fade-in"
            >
              {currentKeyword}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPhotoSearch?.();
        }}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/92 text-foreground shadow-sm ring-1 ring-black/5 transition-colors duration-150 active:bg-white"
        aria-label={ts("photoSearch")}
      >
        <Camera className="h-[18px] w-[18px]" />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openSearch();
        }}
        className="flex h-11 shrink-0 items-center justify-center rounded-full bg-primary px-3 text-[13px] font-semibold text-white shadow-sm transition-colors duration-150 active:bg-primary-hover"
        aria-label={t("search")}
      >
        {t("search")}
      </button>
    </div>
  );
}
