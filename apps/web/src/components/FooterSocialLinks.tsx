'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { SocialIcon, type SocialLink } from '@/lib/social-icons';
import { useTenant } from '@/components/TenantProvider';

export default function FooterSocialLinks() {
  const tenant = useTenant();
  const { data: links } = useSWR<SocialLink[]>(
    tenant ? null : '/social-links',
    fetcher,
    { revalidateOnFocus: false },
  );

  if (!links?.length) return null;

  return (
    <div className="flex items-center gap-2">
      {links.map((link) => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-10 h-10 flex items-center justify-center text-white/50 hover:text-white rounded-lg transition-colors duration-200"
          aria-label={link.label}
        >
          <SocialIcon name={link.icon} className="w-5 h-5" />
        </a>
      ))}
    </div>
  );
}
