"use client";

import { useEffect } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { getAgentPlatform } from "@/lib/agent-platforms";
import { resolveSubsiteAgentKey } from "@/lib/subsite-guides";
import { rememberRecentPlatform } from "@/lib/platform-recents";
import { usePlatformStore } from "@/stores/usePlatformStore";

/**
 * Restores the buying-agent context when a visitor arrives from one of the
 * IndexFinds guide/catalog sites. Explicit `agent` query parameters win;
 * legacy links without that parameter fall back to UTM source or referrer.
 */
export function useSubsiteAgentBridge(
  searchParams: ReadonlyURLSearchParams,
): void {
  const platformKey = usePlatformStore((state) => state.platformKey);
  const setPlatform = usePlatformStore((state) => state.setPlatform);

  useEffect(() => {
    const resolvedKey = resolveSubsiteAgentKey({
      explicitAgent: searchParams.get("agent"),
      utmSource: searchParams.get("utm_source"),
      referrer: typeof document !== "undefined" ? document.referrer : null,
    });

    if (!resolvedKey || !getAgentPlatform(resolvedKey)) return;
    if (platformKey === resolvedKey) return;

    setPlatform(resolvedKey);
    rememberRecentPlatform(resolvedKey);
  }, [platformKey, searchParams, setPlatform]);
}
