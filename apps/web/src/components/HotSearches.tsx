"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Flame } from "lucide-react";
import { useTranslations } from "next-intl";

interface HotSearch {
  keyword: string;
  count: number;
}

interface HotSearchesProps {
  limit?: number;
  className?: string;
  source?: "general" | "personalized";
  initialSearches?: HotSearch[];
}

export default function HotSearches({
  limit = 10,
  className = "",
  source = "personalized",
  initialSearches,
}: HotSearchesProps) {
  const t = useTranslations("search");
  const [searches, setSearches] = useState<HotSearch[]>(initialSearches ?? []);
  const [loading, setLoading] = useState(!initialSearches);

  useEffect(() => {
    if (initialSearches) {
      return;
    }

    const fetchHotSearches = async () => {
      try {
        const endpoint =
          source === "personalized"
            ? `/api/products/hot-searches/personalized?limit=${limit}`
            : `/api/products/hot-searches?limit=${limit}`;
        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          setSearches(data);
        }
      } catch {
        // 静默失败 — 热搜获取失败不影响页面功能
      } finally {
        setLoading(false);
      }
    };

    fetchHotSearches();
  }, [initialSearches, limit, source]);

  if (loading || searches.length === 0) {
    return null;
  }

  return (
    <div className={`hot-searches ${className}`}>
      <h2 className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-3">
        <Flame className="w-4 h-4 text-red-500" aria-hidden="true" />
        {t("hotSearches")}
      </h2>
      <div className="flex flex-wrap gap-2">
        {searches.map((item, index) => (
          <Link
            key={item.keyword}
            href={`/search?q=${encodeURIComponent(item.keyword)}`}
            className={`
              inline-flex min-h-11 items-center px-3 py-1.5 text-sm rounded-full cursor-pointer transition-colors duration-200
              ${
                index < 3
                  ? "bg-red-50 text-red-600 hover:bg-red-100"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }
            `}
          >
            {index < 3 && (
              <span className="font-bold mr-1.5 rtl:ml-1.5 rtl:mr-0 text-xs">
                {index + 1}
              </span>
            )}
            {item.keyword}
          </Link>
        ))}
      </div>
    </div>
  );
}
