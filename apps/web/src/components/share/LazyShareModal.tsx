'use client';

import dynamic from 'next/dynamic';
import type { ShareModalProps } from './ShareModal';

const ShareModal = dynamic(
  () => import('./ShareModal').then((module) => module.ShareModal),
  { ssr: false },
);

export default function LazyShareModal(props: ShareModalProps) {
  return <ShareModal {...props} />;
}
