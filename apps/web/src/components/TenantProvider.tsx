"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { TenantConfig } from "@/lib/tenant-config";
import { getAgentPlatform } from "@/lib/agent-platforms";
import { rememberRecentPlatform } from "@/lib/platform-recents";
import { usePlatformStore } from "@/stores/usePlatformStore";

const TenantContext = createContext<TenantConfig | null>(null);

export function useTenant(): TenantConfig | null {
  return useContext(TenantContext);
}

export default function TenantProvider({
  tenant,
  children,
}: {
  tenant: TenantConfig | null;
  children: ReactNode;
}) {
  const appliedTenant = useRef<string | null>(null);
  const hasHydrated = usePlatformStore((state) => state._hasHydrated);
  const setPlatform = usePlatformStore((state) => state.setPlatform);

  useEffect(() => {
    if (
      !hasHydrated ||
      !tenant?.agentKey ||
      appliedTenant.current === tenant.domain ||
      !getAgentPlatform(tenant.agentKey)
    ) {
      return;
    }

    setPlatform(tenant.agentKey);
    rememberRecentPlatform(tenant.agentKey);
    appliedTenant.current = tenant.domain;
  }, [hasHydrated, setPlatform, tenant]);

  return (
    <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>
  );
}
