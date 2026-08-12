"use client";

import { useEffect, useState } from "react";
import Image, { type ImageProps } from "next/image";

export const PRODUCT_IMAGE_FALLBACK = "/images/product-placeholder.svg";

interface ImageWithFallbackProps extends ImageProps {
  fallbackSrc?: string;
}

export default function ImageWithFallback({
  src,
  alt,
  fallbackSrc = PRODUCT_IMAGE_FALLBACK,
  onError,
  unoptimized,
  ...props
}: ImageWithFallbackProps) {
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc);

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc);
  }, [fallbackSrc, src]);

  const usingFallback = currentSrc === fallbackSrc;

  return (
    <Image
      {...props}
      src={currentSrc}
      alt={alt}
      unoptimized={unoptimized || undefined}
      onError={(event) => {
        onError?.(event);
        if (!usingFallback) setCurrentSrc(fallbackSrc);
      }}
    />
  );
}
