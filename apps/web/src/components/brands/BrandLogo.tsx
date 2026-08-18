'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * 根据品牌名称生成稳定的渐变色
 * 同一品牌每次渲染颜色相同
 */
function getBrandGradient(name: string): { from: string; to: string } {
  const gradients = [
    { from: '#667eea', to: '#764ba2' },
    { from: '#f093fb', to: '#f5576c' },
    { from: '#4facfe', to: '#00f2fe' },
    { from: '#43e97b', to: '#38f9d7' },
    { from: '#fa709a', to: '#fee140' },
    { from: '#a18cd1', to: '#fbc2eb' },
    { from: '#fccb90', to: '#d57eeb' },
    { from: '#e0c3fc', to: '#8ec5fc' },
    { from: '#f5576c', to: '#ff9a9e' },
    { from: '#13547a', to: '#80d0c7' },
    { from: '#ff9a9e', to: '#fecfef' },
    { from: '#a1c4fd', to: '#c2e9fb' },
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

interface BrandLogoProps {
  name: string;
  logoUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  priority?: boolean;
}

const sizeMap = {
  sm: { container: 'w-10 h-10', text: 'text-sm', imgSize: 40 },
  md: { container: 'w-14 h-14', text: 'text-xl', imgSize: 56 },
  lg: { container: 'w-20 h-20', text: 'text-3xl', imgSize: 80 },
  xl: { container: 'w-16 h-16', text: 'text-2xl', imgSize: 64 },
};

function getBrandInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();

  return initials || '?';
}

export default function BrandLogo({
  name,
  logoUrl,
  size = 'md',
  className,
  priority = false,
}: BrandLogoProps) {
  const { container, text, imgSize } = sizeMap[size];
  const gradient = getBrandGradient(name);
  const initials = getBrandInitials(name);
  const imageRef = useRef<HTMLImageElement>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);

    if (!logoUrl) return;

    const frame = window.requestAnimationFrame(() => {
      const image = imageRef.current;
      if (image?.complete && image.naturalWidth > 0) {
        setIsLoaded(true);
      }
    });

    const timeout = window.setTimeout(() => {
      const image = imageRef.current;
      if (!image?.complete || image.naturalWidth === 0) {
        setHasError(true);
      }
    }, 8000);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [logoUrl]);

  if (logoUrl && !hasError) {
    return (
      <div
        className={cn(
          container,
          'relative rounded-xl overflow-hidden bg-white border border-border flex-shrink-0',
          className,
        )}
      >
        <div
          aria-hidden="true"
          className={cn(
            'absolute inset-1 flex items-center justify-center rounded-[10px] transition-opacity duration-200',
            isLoaded && 'opacity-0',
          )}
          style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
        >
          <span className={cn(text, 'font-bold text-white drop-shadow-sm')}>{initials}</span>
        </div>
        <Image
          ref={imageRef}
          src={logoUrl}
          alt={name}
          width={imgSize}
          height={imgSize}
          priority={priority}
          className={cn(
            'relative z-10 object-contain w-full h-full p-1 transition-opacity duration-200',
            isLoaded ? 'opacity-100' : 'opacity-0',
          )}
          onLoad={(event) => {
            if (event.currentTarget.naturalWidth > 0) setIsLoaded(true);
          }}
          onError={() => setHasError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(container, 'rounded-xl flex-shrink-0 flex items-center justify-center', className)}
      style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
    >
      <span className={cn(text, 'font-bold text-white drop-shadow-sm')}>{initials}</span>
    </div>
  );
}
