import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { getSiteName } from '@/lib/site-config';
import { getManifestDescription } from '@/lib/home-seo';
import {
  resolveTenantFromHeaders,
  type TenantBranding,
} from '@/lib/tenant-config';

export const dynamic = 'force-dynamic';

export function buildManifest(
  branding?: TenantBranding,
): MetadataRoute.Manifest {
  const siteName = branding?.siteName || getSiteName();

  return {
    name: siteName,
    short_name: siteName,
    description: branding?.description || getManifestDescription(),
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: branding?.themeColor || '#FFFFFF',
    background_color: '#FAFAFA',
    icons: branding
      ? [
          {
            src: branding.faviconPath,
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ]
      : [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
        ],
    categories: ['shopping', 'lifestyle'],
  };
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const headersList = await headers();
  const tenant = resolveTenantFromHeaders(
    headersList,
    process.env.INDEXFINDS_LOCAL_TENANT_HOST,
  );
  return buildManifest(tenant?.branding);
}
