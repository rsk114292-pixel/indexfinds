'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  name: string;
  logoUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  priority?: boolean;
}

const sizeMap = {
  sm: { container: 'w-10 h-10', imgSize: 40 },
  md: { container: 'w-14 h-14', imgSize: 56 },
  lg: { container: 'w-20 h-20', imgSize: 80 },
  xl: { container: 'w-16 h-16', imgSize: 64 },
};

export default function BrandLogo({
  name,
  logoUrl,
  size = 'md',
  className,
  priority = false,
}: BrandLogoProps) {
  const { container, imgSize } = sizeMap[size];
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

  if (!logoUrl || hasError) return null;

  return (
    <div
      className={cn(
        container,
        'relative flex-shrink-0 overflow-hidden rounded-xl border border-border bg-white transition-opacity duration-200',
        isLoaded ? 'opacity-100' : 'opacity-0',
        className,
      )}
    >
      <Image
        ref={imageRef}
        src={logoUrl}
        alt={name}
        width={imgSize}
        height={imgSize}
        priority={priority}
        className="h-full w-full object-contain p-1"
        onLoad={(event) => {
          if (event.currentTarget.naturalWidth > 0) setIsLoaded(true);
        }}
        onError={() => setHasError(true)}
      />
    </div>
  );
}
