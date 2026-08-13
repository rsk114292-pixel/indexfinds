import type { Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Arabic } from "next/font/google";
import { cookies, headers } from "next/headers";
import AppRuntime from "@/components/AppRuntime";
import NoticeHost from "@/components/NoticeHost";
import { defaultLocale, isRTL, locales } from "@/i18n/config";
import { getSiteName, getThemeVars } from "@/lib/site-config";
import "./globals.css";

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

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const headersList = await headers();
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
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icons/logo.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={getSiteName()} />
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
