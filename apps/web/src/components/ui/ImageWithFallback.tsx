"use client";

import { useEffect, useState } from "react";
import Image, { type ImageProps } from "next/image";
import { useTenant } from "@/components/TenantProvider";

export const PRODUCT_IMAGE_FALLBACK = "/images/product-placeholder.svg";
export const TENANT_PRODUCT_IMAGE_FALLBACK =
  "/images/product-placeholder-neutral.svg";

interface ImageWithFallbackProps extends ImageProps {
  fallbackSrc?: string;
}

export default function ImageWithFallback({
  src,
  alt,
  fallbackSrc,
  onError,
  unoptimized,
  ...props
}: ImageWithFallbackProps) {
  const tenant = useTenant();
  const resolvedFallbackSrc =
    fallbackSrc ||
    (tenant ? TENANT_PRODUCT_IMAGE_FALLBACK : PRODUCT_IMAGE_FALLBACK);
  const preferredSrc =
    tenant &&
    typeof src === "string" &&
    src.includes("/images/product-placeholder.svg")
      ? resolvedFallbackSrc
      : src || resolvedFallbackSrc;
  const [currentSrc, setCurrentSrc] = useState(preferredSrc);

  useEffect(() => {
    setCurrentSrc(preferredSrc);
  }, [preferredSrc]);

  const usingFallback = currentSrc === resolvedFallbackSrc;

  return (
    <Image
      {...props}
      src={currentSrc}
      alt={alt}
      unoptimized={unoptimized || usingFallback || undefined}
      onError={(event) => {
        onError?.(event);
        if (!usingFallback) setCurrentSrc(resolvedFallbackSrc);
      }}
    />
  );
}
