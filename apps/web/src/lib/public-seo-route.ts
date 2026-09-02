export function isPublicSeoRoute(pathname: string) {
  return (
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/sitemaps/')
  );
}
