/**
 * 前台 Layout（Shop Layout）
 * 应用于所有前台页面（首页、分类页、商品详情等）
 *
 * 双布局分发：
 * - PC（lg+）：Header + Footer
 * - 移动端（<lg）：MobileHeader + MobileTabBar
 * - 商品详情页（移动端）：沉浸式模式，隐藏 MobileHeader/TabBar，由页面内浮动按钮接管
 * - children 只渲染一次，避免 React 双重挂载
 */
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileHeader from '@/components/mobile/MobileHeader';
import MobileTabBar from '@/components/mobile/MobileTabBar';
import MobilePageTransition from '@/components/mobile/MobilePageTransition';
import { MobileImmersiveGuard, MobileHeaderGuard, ImmersiveMain } from '@/components/mobile/MobileImmersiveGuard';
import { SkipToContent } from '@/components/SkipToContent';
import TenantProvider from '@/components/TenantProvider';
import { headers } from 'next/headers';
import { resolveTenantFromHeaders } from '@/lib/tenant-config';
import type { CSSProperties } from 'react';

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const localTenantHost = process.env.INDEXFINDS_LOCAL_TENANT_HOST;
  const tenant = resolveTenantFromHeaders(headersList, localTenantHost);
  const tenantStyle = tenant?.branding
    ? ({
        '--color-primary': tenant.branding.primaryColor,
        '--color-primary-hover': tenant.branding.primaryHoverColor,
        '--color-accent': tenant.branding.accentColor,
      } as CSSProperties)
    : undefined;

  return (
    <TenantProvider tenant={tenant}>
      <div
        className="flex min-h-dvh flex-col"
        data-tenant={tenant?.domain || 'indexfinds.com'}
        style={tenantStyle}
      >
        <SkipToContent />
        {/* PC 端顶栏 — 仅 lg 以上显示 */}
        <div className="hidden lg:sticky lg:top-0 lg:z-50 lg:block lg:bg-[#030712]">
          <Header />
        </div>

        {/* 移动端顶栏 — 沉浸式页面（商品详情）和个人中心自动隐藏 */}
        <MobileHeaderGuard>
          <div className="lg:hidden">
            <MobileHeader />
          </div>
        </MobileHeaderGuard>

        {/* 页面内容 — 移动端 pt-12/pb-14 为 fixed Header/TabBar 留空，沉浸式页面自动移除 */}
        <ImmersiveMain id="main-content">
          <MobilePageTransition>
            {children}
          </MobilePageTransition>
        </ImmersiveMain>

        {/* PC 端底栏 */}
        <div className="hidden lg:block">
          <Footer />
        </div>

        {/* 移动端底部 TabBar — 沉浸式页面自动隐藏 */}
        <MobileImmersiveGuard>
          <div className="lg:hidden">
            <MobileTabBar />
          </div>
        </MobileImmersiveGuard>
      </div>
    </TenantProvider>
  );
}
