"use client";

import { Repeat2, ShoppingCart } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import FavoriteButton from "@/components/FavoriteButton";
import { useCurrencyStore } from "@/stores/useCurrencyStore";
import {
  getLocalizedPlatformName,
  useCurrentPlatform,
} from "@/stores/usePlatformStore";
import { convertPrice, formatPrice } from "@/lib/utils";

interface MobileBuyBarProps {
  productId: string;
  price: number;
  sourceCurrency: string;
  disabled?: boolean;
  loading?: boolean;
  onOpenPlatformSelect: () => void;
  onBuyPreferred?: (platformKey: string) => void | Promise<void>;
  onFavoriteChange?: (isFavorited: boolean) => void;
}

/**
 * 移动端固定底部操作栏（Section 6.3）
 *
 * 线框：
 * ├═══════════════════════┤
 * │ [❤️收藏] [🛒去购买]      │  ← 固定底部操作栏
 * └───────────────────────┘
 */
export default function MobileBuyBar({
  productId,
  price,
  sourceCurrency,
  disabled,
  loading,
  onOpenPlatformSelect,
  onBuyPreferred,
  onFavoriteChange,
}: MobileBuyBarProps) {
  const t = useTranslations("buy");
  const locale = useLocale();
  const currentPlatform = useCurrentPlatform();
  const { currency: displayCurrency, rates } = useCurrencyStore();
  const convertedPrice = convertPrice(
    price,
    sourceCurrency,
    displayCurrency,
    rates,
  );
  const priceLabel = `${displayCurrency !== sourceCurrency ? "≈ " : ""}${formatPrice(convertedPrice, displayCurrency)}`;
  const agentName = currentPlatform
    ? getLocalizedPlatformName(currentPlatform, locale)
    : t("chooseAgent");
  const handlePrimaryAction = () => {
    if (currentPlatform && onBuyPreferred) {
      void onBuyPreferred(currentPlatform.key);
      return;
    }
    onOpenPlatformSelect();
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/98 px-3 pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm pb-[calc(env(safe-area-inset-bottom)+8px)]">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenPlatformSelect}
          className="min-h-11 w-[96px] min-w-0 shrink-0 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={currentPlatform ? t("changeAgent") : t("chooseAgent")}
        >
          <p className="truncate text-sm font-extrabold text-primary">
            {priceLabel}
          </p>
          <span className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-muted">
            <Repeat2 className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{agentName}</span>
          </span>
        </button>
        {/* 收藏按钮 */}
        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <FavoriteButton
            productId={productId}
            size="large"
            onStatusChange={onFavoriteChange}
          />
        </div>

        {/* 购买按钮 */}
        <button
          onClick={handlePrimaryAction}
          disabled={disabled || loading}
          className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 font-semibold text-white transition-transform duration-150 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="truncate">
            {loading
              ? "..."
              : currentPlatform
                ? t("continueTo", { platform: agentName })
                : t("chooseAgentToBuy")}
          </span>
        </button>
      </div>
    </div>
  );
}
