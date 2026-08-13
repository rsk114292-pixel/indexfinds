"use client";

import { useState, useCallback, useEffect } from "react";
import { Menu, Globe, User, Store } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useSearchParams, usePathname } from "next/navigation";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { isScrollHideHeaderPath } from "@/lib/utils";
import { PUBLIC_AUTH_ENTRY_ENABLED } from "@/lib/features";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  usePlatformStore,
  useCurrentPlatform,
} from "@/stores/usePlatformStore";
import { useTranslations } from "next-intl";
import BrandWordmark from "@/components/BrandWordmark";
import PlatformLogoBadge from "@/components/platforms/PlatformLogoBadge";
import MobilePlatformSheet from "./MobilePlatformSheet";
import MobileSettingsSheet from "./MobileSettingsSheet";
import MobileHamburgerDrawer from "./MobileHamburgerDrawer";
import MobileSearchEntry from "./MobileSearchEntry";
import MobileSearchOverlay from "./MobileSearchOverlay";
import { usePersonalizedHotSearches } from "@/hooks/usePersonalizedHotSearches";

/**
 * 移动端顶栏
 *
 * 规格：导航行 48px + 搜索行 56px = 104px (6.5rem)
 * 布局：[☰] [Logo]       [平台Logo] [🌐] [头像]
 *       [────── 搜索入口 ──────]
 * 安全区：pt-[env(safe-area-inset-top)]
 */
export default function MobileHeader() {
  const { user, isAuthenticated, _hasHydrated: authHydrated } = useAuthStore();
  const { _hasHydrated: platformHydrated } = usePlatformStore();
  const currentPlatform = useCurrentPlatform();
  const t = useTranslations("header");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const scrollHideEnabled = isScrollHideHeaderPath(pathname);
  const { headerVisible } = useScrollDirection({
    disabled: !scrollHideEnabled,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [photoMode, setPhotoMode] = useState(false);
  const [initialQuery, setInitialQuery] = useState<string | undefined>();
  const handleAvatarError = useCallback(() => setAvatarError(true), []);

  const showAvatar = isAuthenticated && user?.avatar && !avatarError;
  const currentQuery = searchParams.get("q") || "";
  const isHomePage = /^\/[a-z]{2}\/?$/.test(pathname) || pathname === "/";
  const [homeSearchVisible, setHomeSearchVisible] = useState(false);

  useEffect(() => {
    if (!isHomePage) {
      setHomeSearchVisible(true);
      return;
    }

    const updateSearchVisibility = () =>
      setHomeSearchVisible(window.scrollY > 420);
    updateSearchVisibility();
    window.addEventListener("scroll", updateSearchVisibility, {
      passive: true,
    });
    return () => window.removeEventListener("scroll", updateSearchVisibility);
  }, [isHomePage]);

  // 热搜词（个性化）
  const { items: hotKeywords } = usePersonalizedHotSearches({ limit: 5 });

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-20 bg-surface pt-[env(safe-area-inset-top)] shadow-[0_1px_0_rgba(0,0,0,0.06)]">
        {/* 导航行 — 下滑折叠 */}
        <div
          className="overflow-hidden transition-[max-height] duration-300"
          style={{ maxHeight: headerVisible ? "48px" : "0px" }}
        >
          <div className="flex h-12 items-center justify-between px-4">
            {/* 左侧：汉堡 + Logo */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-full active:scale-95 active:bg-gray-100 transition-transform duration-150"
                aria-label={t("menu")}
              >
                <Menu className="h-5 w-5 text-foreground" />
              </button>
              <Link
                href="/"
                aria-label="IndexFinds"
                className="inline-flex h-11 items-center"
              >
                <BrandWordmark tone="dark" className="scale-90 origin-left" />
              </Link>
            </div>

            {/* 右侧操作区 */}
            <div className="flex items-center gap-0.5">
              {/* 代购平台选择 */}
              <button
                type="button"
                onClick={() => setPlatformOpen(true)}
                className="flex h-11 min-w-11 items-center gap-1 px-2 rounded-full active:scale-95 active:bg-gray-100 transition-transform duration-150"
                aria-label={t("platformSelect")}
              >
                {platformHydrated && currentPlatform ? (
                  <PlatformLogoBadge
                    platformKey={currentPlatform.key}
                    name={currentPlatform.name}
                    logoUrl={currentPlatform.logoUrl}
                    className="flex h-6 w-6 items-center justify-center rounded"
                    imageClassName="h-6 w-6 rounded object-contain"
                    labelClassName="text-[8px] font-bold"
                  />
                ) : (
                  <Store className="h-5 w-5 text-foreground" />
                )}
                <svg
                  className="w-3 h-3 text-muted"
                  fill="none"
                  viewBox="0 0 12 12"
                >
                  <path
                    d="M3 4.5L6 7.5L9 4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* 语言/货币设置 */}
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-full active:scale-95 active:bg-gray-100 transition-transform duration-150"
                aria-label={t("settings")}
              >
                <Globe className="h-5 w-5 text-foreground" />
              </button>

              {/* 头像 / 登录 */}
              {authHydrated &&
                (isAuthenticated || PUBLIC_AUTH_ENTRY_ENABLED) && (
                <Link
                  href={isAuthenticated ? "/account" : "/login"}
                  className="flex h-11 w-11 items-center justify-center rounded-full active:scale-95 active:bg-gray-100 transition-transform duration-150"
                  aria-label={isAuthenticated ? t("myAccount") : tc("login")}
                >
                  {showAvatar ? (
                    <div className="relative w-7 h-7 rounded-full overflow-hidden bg-gray-100">
                      <Image
                        src={user!.avatar!}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="28px"
                        onError={handleAvatarError}
                      />
                    </div>
                  ) : (
                    <User className="h-5 w-5 text-foreground" />
                  )}
                </Link>
                )}
            </div>
          </div>
        </div>

        {/* 首页离开首屏后再显示固定搜索入口，其他页面始终显示 */}
        {(!isHomePage || homeSearchVisible) && (
          <div className="px-4 py-1.5">
            <MobileSearchEntry
              onTap={(keyword) => {
                if (keyword) setInitialQuery(keyword);
                setSearchOpen(true);
              }}
              onPhotoSearch={() => {
                setPhotoMode(true);
                setSearchOpen(true);
              }}
              query={currentQuery || undefined}
              rotatingKeywords={hotKeywords?.map((h) => h.keyword)}
            />
          </div>
        )}
      </header>

      {/* 全屏搜索浮层 */}
      <MobileSearchOverlay
        open={searchOpen}
        onClose={() => {
          setSearchOpen(false);
          setPhotoMode(false);
          setInitialQuery(undefined);
        }}
        autoTriggerPhoto={photoMode}
        initialQuery={currentQuery || initialQuery || undefined}
      />

      {/* Hamburger Drawer */}
      <MobileHamburgerDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Bottom Sheets */}
      <MobilePlatformSheet
        open={platformOpen}
        onClose={() => setPlatformOpen(false)}
      />
      <MobileSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
