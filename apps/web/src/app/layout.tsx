import type { Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { cookies, headers } from "next/headers";
import AppRuntime from "@/components/AppRuntime";
import NoticeHost from "@/components/NoticeHost";
import { defaultLocale, isRTL, locales } from "@/i18n/config";
import { getSiteName, getThemeVars } from "@/lib/site-config";
import { resolveTenantFromHeaders } from "@/lib/tenant-config";
import "./globals.css";

const LA51_TRACKING_ID = "3QNswCxHDkPanqOo";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFFFF",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoArabic = localFont({
  src: "../../node_modules/@fontsource-variable/noto-sans-arabic/files/noto-sans-arabic-arabic-wght-normal.woff2",
  variable: "--font-arabic",
  display: "swap",
  weight: "100 900",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const headersList = await headers();
  const tenant = resolveTenantFromHeaders(
    headersList,
    process.env.INDEXFINDS_LOCAL_TENANT_HOST,
  );
  const branding = tenant?.branding;
  const siteName = branding?.siteName || getSiteName();
  const pathname = headersList.get("x-pathname") || "";
  const pathLocale = pathname.split("/")[1];
  const localeFromPath = locales.includes(pathLocale as (typeof locales)[number])
    ? pathLocale
    : null;
  const localeFromCookie = cookieStore.get("NEXT_LOCALE")?.value || null;
  const locale = localeFromPath || localeFromCookie || defaultLocale;
  const dir = isRTL(locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} style={getThemeVars()} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://si.geilicdn.com" />
        <link rel="icon" href={branding?.faviconPath || "/favicon.ico"} sizes="any" />
        {!branding && <link rel="icon" href="/icons/logo.svg" type="image/svg+xml" />}
        <link
          rel="manifest"
          href="/manifest.webmanifest"
          crossOrigin="use-credentials"
        />
        <link rel="apple-touch-icon" href={branding?.logoPath || "/icons/apple-touch-icon.png"} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={siteName} />
        {!tenant && (
          <>
            <script
              dangerouslySetInnerHTML={{
                __html:
                  "window.LA=window.LA||{init:function(config){this.config=config;}};",
              }}
            />
            <script
              async
              charSet="UTF-8"
              id="LA_COLLECT"
              src="https://sdk.51.la/js-sdk-pro.min.js"
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `LA.init({id:"${LA51_TRACKING_ID}",ck:"${LA51_TRACKING_ID}"});`,
              }}
            />
          </>
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoArabic.variable} antialiased`}
        suppressHydrationWarning
      >
        <AppRuntime />
        <NoticeHost />
        {children}
        {process.env.NODE_ENV === "production" ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js');
                  });
                }
              `,
            }}
          />
        ) : (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations()
                    .then(function(regs) { regs.forEach(function(r) { r.unregister(); }); })
                    .catch(function() {});
                }
                if ('caches' in window) {
                  caches.keys()
                    .then(function(keys) { return Promise.all(keys.map(function(k) { return caches.delete(k); })); })
                    .catch(function() {});
                }
              `,
            }}
          />
        )}
      </body>
    </html>
  );
}
