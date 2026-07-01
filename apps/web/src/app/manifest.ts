import type { MetadataRoute } from 'next';
import { getSiteName } from '@/lib/site-config';
import { getManifestDescription } from '@/lib/home-seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: getSiteName(),
    short_name: getSiteName(),
    description: getManifestDescription(),
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#FFFFFF',
    background_color: '#FAFAFA',
    icons: [
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
