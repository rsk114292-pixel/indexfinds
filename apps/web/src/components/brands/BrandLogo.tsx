'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';

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
}

const sizeMap = {
  sm: { container: 'w-10 h-10', text: 'text-sm', imgSize: 40 },
  md: { container: 'w-14 h-14', text: 'text-xl', imgSize: 56 },
  lg: { container: 'w-20 h-20', text: 'text-3xl', imgSize: 80 },
  xl: { container: 'w-16 h-16', text: 'text-2xl', imgSize: 64 },
};

export default function BrandLogo({ name, logoUrl, size = 'md', className }: BrandLogoProps) {
  const { container, text, imgSize } = sizeMap[size];
  const gradient = getBrandGradient(name);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
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
        {!isLoaded && (
          <div className="absolute inset-0 z-10 p-1">
            <Skeleton className="h-full w-full rounded-[10px]" />
          </div>
        )}
        <Image
          src={logoUrl}
          alt={name}
          width={imgSize}
          height={imgSize}
          className={cn(
            'object-contain w-full h-full p-1 transition-opacity duration-200',
            isLoaded ? 'opacity-100' : 'opacity-0',
          )}
          onLoad={() => setIsLoaded(true)}
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
      <span className={cn(text, 'font-bold text-white drop-shadow-sm')}>
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}
