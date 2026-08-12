"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const CONSENT_KEY = "cookie_consent";
const CONSENT_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

export type ConsentStatus = "pending" | "accepted" | "rejected";

export function isReferralAttributionContext(
  searchParams: URLSearchParams,
): boolean {
  const utmSource = searchParams.get("utm_source")?.toLowerCase() || "";
  const utmMedium = searchParams.get("utm_medium")?.toLowerCase() || "";
  const utmCampaign = searchParams.get("utm_campaign")?.toLowerCase() || "";

  if (searchParams.has("referral_code") || searchParams.has("ref_click_id")) {
    return true;
  }

  if (utmSource === "referral_link") {
    return true;
  }

  if (utmMedium === "referral" || utmMedium === "influencer") {
    return true;
  }

  return (
    utmCampaign.startsWith("referral_") || utmCampaign.startsWith("creator_")
  );
}

interface CookieConsentContextValue {
  consent: ConsentStatus;
  accept: () => void;
  reject: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(
  null,
);

function readConsentCookie(): ConsentStatus | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${CONSENT_KEY}=([^;]*)`),
  );
  const value = match ? decodeURIComponent(match[1]) : null;
  if (value === "accepted" || value === "rejected") {
    return value;
  }
  return null;
}

function writeConsentCookie(value: Exclude<ConsentStatus, "pending">): void {
  if (typeof document === "undefined") return;

  document.cookie = `${CONSENT_KEY}=${encodeURIComponent(value)}; path=/; max-age=${CONSENT_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function CookieConsentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [consent, setConsent] = useState<ConsentStatus>("pending");

  useEffect(() => {
    const syncConsent = () => {
      const fromCookie = readConsentCookie();
      if (fromCookie) {
        localStorage.setItem(CONSENT_KEY, fromCookie);
        setConsent(fromCookie);
        return;
      }

      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored === "accepted" || stored === "rejected") {
        writeConsentCookie(stored);
        setConsent(stored);
        return;
      }
      setConsent("pending");
    };

    syncConsent();
    window.addEventListener("storage", syncConsent);

    return () => {
      window.removeEventListener("storage", syncConsent);
    };
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    writeConsentCookie("accepted");
    setConsent("accepted");
  };

  const reject = () => {
    localStorage.setItem(CONSENT_KEY, "rejected");
    writeConsentCookie("rejected");
    setConsent("rejected");
  };

  const value = useMemo(() => ({ consent, accept, reject }), [consent]);

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);

  if (!context) {
    throw new Error(
      "useCookieConsent must be used within CookieConsentProvider",
    );
  }

  return context;
}

export default function CookieConsent() {
  const { consent, accept, reject } = useCookieConsent();
  const t = useTranslations("cookies");
  const pathname = usePathname();
  const isProductDetail = /^\/products\/[^/]+/.test(pathname);
  const [isReferralPrompt, setIsReferralPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsReferralPrompt(
      isReferralAttributionContext(new URLSearchParams(window.location.search)),
    );
  }, []);

  if (consent !== "pending") return null;

  if (isReferralPrompt) {
    return (
      <div
        className={cn(
          "fixed inset-x-0 z-50 p-4 sm:p-6 lg:bottom-0",
          isProductDetail
            ? "bottom-[calc(env(safe-area-inset-bottom)+60px)]"
            : "bottom-[calc(env(safe-area-inset-bottom)+56px)]",
        )}
      >
        <div
          data-testid="cookie-consent"
          data-consent-variant="referral"
          className="mx-auto max-w-lg rounded-2xl border border-border bg-surface/98 p-5 shadow-2xl backdrop-blur-sm"
        >
          <p className="text-sm font-semibold text-foreground">
            {t("message")}
          </p>
          <p className="mt-2 text-sm text-muted">{t("attributionHint")}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              onClick={reject}
              className="min-h-11 rounded-md border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted/50 cursor-pointer"
            >
              {t("reject")}
            </button>
            <button
              onClick={accept}
              className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover cursor-pointer"
            >
              {t("accept")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="cookie-consent"
      data-consent-variant="default"
      className={cn(
        "fixed left-0 right-0 z-50 border-t border-border bg-surface/95 backdrop-blur-sm lg:bottom-0",
        isProductDetail
          ? "bottom-[calc(env(safe-area-inset-bottom)+60px)]"
          : "bottom-[calc(env(safe-area-inset-bottom)+56px)]",
      )}
    >
      <div className="container mx-auto flex items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-4">
        <p className="line-clamp-2 text-[11px] leading-4 text-muted sm:text-sm">
          {t("message")}
        </p>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            onClick={reject}
            className="min-h-11 rounded-md px-3 py-2 text-xs text-muted transition-colors hover:text-foreground sm:text-sm cursor-pointer"
          >
            {t("reject")}
          </button>
          <button
            onClick={accept}
            className="min-h-11 rounded-md bg-primary px-3 py-2 text-xs text-white transition-colors hover:bg-primary-hover sm:text-sm cursor-pointer"
          >
            {t("accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
