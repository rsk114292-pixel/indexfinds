"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Search } from "lucide-react";

interface FindSimilarButtonProps {
  productId: string;
  /** capsule 模式：移动端 tag 行中使用，圆角全圆 + 紧凑尺寸 */
  capsule?: boolean;
  className?: string;
}

export default function FindSimilarButton({
  productId,
  capsule = false,
  className = "",
}: FindSimilarButtonProps) {
  const t = useTranslations("product");

  if (capsule) {
    return (
      <Link
        href={`/search/visual?productId=${productId}`}
        data-testid="find-similar-button"
        className={`inline-flex min-h-11 items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 active:scale-95 transition-transform ${className}`}
      >
        <Search className="w-3 h-3" />
        {t("findSimilar")}
      </Link>
    );
  }

  return (
    <Link
      href={`/search/visual?productId=${productId}`}
      data-testid="find-similar-button"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted hover:text-foreground border border-border rounded-lg hover:bg-gray-50 transition-colors ${className}`}
    >
      <Search className="w-4 h-4" />
      {t("findSimilar")}
    </Link>
  );
}
