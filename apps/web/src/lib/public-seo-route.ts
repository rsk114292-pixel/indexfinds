export function isPublicSeoRoute(pathname: string) {
  return (
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/sitemaps/')
  );
}
