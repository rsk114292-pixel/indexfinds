"use client";

import AccountSidebar from "@/components/account/AccountSidebar";
import { useAuthStore } from "@/stores/useAuthStore";

export default function AccountLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const showSidebar = _hasHydrated && isAuthenticated;

  return (
    <div className="lg:max-w-7xl lg:mx-auto lg:px-4 lg:py-6">
      <div className="lg:flex lg:gap-8">
        {showSidebar && (
          <div className="hidden lg:block">
            <AccountSidebar />
          </div>
        )}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
