'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { getImageReferrerPolicy, getProductDetailThumbnail } from '@/lib/image-utils';
import {
  parseSkuAttributes,
  isInvalidAttribute,
  isSizeValue,
  isSizeAttributeName,
  isColorAttributeName,
  getAttributePriority,
  type AttributeOption,
} from '@/lib/sku-utils';
import { CollapsibleChipGrid } from './CollapsibleChipGrid';
import type { SKU } from '@/types';

interface MobileInlineSKUProps {
  skus: SKU[];
  productImages: string[];
  selectedAttributes: Record<string, string>;
  onAttributeChange: (attrName: string, value: string) => void;
  onImageSelect: (index: number) => void;
  onOpenSheet: () => void;
  currentImageIndex?: number;
  sizeOnly?: boolean;
}

export function MobileInlineSKU({
  skus,
  productImages,
  selectedAttributes,
  onAttributeChange,
  onImageSelect,
  onOpenSheet,
  currentImageIndex = 0,
  sizeOnly = false,
}: MobileInlineSKUProps) {
  const t = useTranslations('product');
  const tc = useTranslations('common');

  const attributeOptions = useMemo(() => {
    if (skus.length === 0) return {};
    const options: Record<string, AttributeOption[]> = {};
    skus.forEach((sku) => {
      const attrs = parseSkuAttributes(sku.attributes);
      if (Object.keys(attrs).length > 0) {
        Object.entries(attrs).forEach(([key, value]) => {
          if (isInvalidAttribute(key, value)) return;
          if (!options[key]) options[key] = [];
          const existing = options[key].find((item) => item.value === value);
          if (!existing) {
            const isColorAttr = isColorAttributeName(key);
            const isSize = !isColorAttr && isSizeValue(value);
            options[key].push({
              value,
              image: isSize ? undefined : (sku.image || sku.imageUrl),
            });
          }
        });
      }
    });
    const filtered: Record<string, AttributeOption[]> = {};
    for (const [key, values] of Object.entries(options)) {
      const isSizeAttribute =
        isSizeAttributeName(key) ||
        (!isColorAttributeName(key) && values.every((item) => isSizeValue(item.value)));
      if (sizeOnly && !isSizeAttribute) continue;
      if (values.length > 0) filtered[key] = values;
    }
    return filtered;
  }, [sizeOnly, skus]);

  const sortedEntries = useMemo(() => {
    return Object.entries(attributeOptions).sort(
      ([nameA, valuesA], [nameB, valuesB]) => {
        const aHasImages = valuesA.some((v) => v.image);
        const bHasImages = valuesB.some((v) => v.image);
        const aIsSize =
          isSizeAttributeName(nameA) ||
          (!isColorAttributeName(nameA) && valuesA.every((v) => isSizeValue(v.value)));
        const bIsSize =
          isSizeAttributeName(nameB) ||
          (!isColorAttributeName(nameB) && valuesB.every((v) => isSizeValue(v.value)));
        return (
          getAttributePriority(aHasImages, aIsSize) -
          getAttributePriority(bHasImages, bIsSize)
        );
      },
    );
  }, [attributeOptions]);

  const handleImageOptionClick = (attrName: string, option: AttributeOption) => {
    onAttributeChange(attrName, option.value);
    if (option.image && productImages.length > 0) {
      const imageIndex = productImages.findIndex((img) => img === option.image);
      if (imageIndex >= 0) {
        onImageSelect(imageIndex);
      }
    }
  };

  if (sortedEntries.length === 0) return null;

  return (
    <div className="px-4 py-3 space-y-3">
      {sortedEntries.map(([attrName, attrValues]) => {
        const isColorAttr = isColorAttributeName(attrName);
        const isSizeByName = isSizeAttributeName(attrName);
        const isSizeByValue =
          !isColorAttr && attrValues.every((v) => isSizeValue(v.value));
        const isSizeAttribute = isSizeByName || isSizeByValue;
        const hasSkuImages = attrValues.some((v) => v.image);

        const otherNonSizeAttrs = Object.entries(attributeOptions).filter(
          ([name, values]) => {
            if (isSizeAttributeName(name)) return false;
            if (isColorAttributeName(name)) return true;
            const isSizeByVal = values.length > 0 && values.every((v) => isSizeValue(v.value));
            return !isSizeByVal;
          }
        );
        const isFirstNonSizeAttr =
          otherNonSizeAttrs.length > 0 && otherNonSizeAttrs[0][0] === attrName;
        const canFallbackToProductImages =
          !isSizeAttribute &&
          !hasSkuImages &&
          productImages.length > 1 &&
          isFirstNonSizeAttr;
        const showAsImages = !isSizeAttribute && (hasSkuImages || canFallbackToProductImages);
        const useFallbackImages = canFallbackToProductImages && !hasSkuImages;

        const displayLabel = isSizeAttribute
          ? t('size')
          : isColorAttr || hasSkuImages || canFallbackToProductImages
            ? t('style')
            : attrName;

        return (
          <div key={attrName}>
            <button
              onClick={onOpenSheet}
              className="flex w-full items-center justify-between mb-2 min-h-[44px] active:bg-gray-50 rounded-lg -mx-1 px-1 transition-colors duration-150"
            >
              <div className="text-sm font-medium text-foreground">
                {displayLabel}
                {selectedAttributes[attrName] && (
                  <span className="text-muted font-normal ml-1.5 rtl:mr-1.5 rtl:ml-0">
                    {selectedAttributes[attrName]}
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-muted flex-shrink-0" />
            </button>

            {showAsImages ? (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {useFallbackImages
                  ? productImages.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => onImageSelect(index)}
                        className={`relative w-14 h-14 flex-shrink-0 border-2 rounded-lg overflow-hidden transition-all duration-150 ${
                          currentImageIndex === index
                            ? 'border-primary ring-1 ring-primary/30 scale-105'
                            : 'border-border active:scale-95'
                        }`}
                      >
                        <span className="absolute inset-0 flex items-center justify-center bg-slate-50 text-xs font-semibold text-slate-400">
                          {index + 1}
                        </span>
                        <Image
                          src={getProductDetailThumbnail(image)}
                          alt={t('styleN', { n: index + 1 })}
                          fill
                          className="z-10 bg-white object-cover"
                          sizes="56px"
                          referrerPolicy={getImageReferrerPolicy(getProductDetailThumbnail(image))}
                          onError={(event) => {
                            event.currentTarget.style.display = 'none';
                          }}
                        />
                      </button>
                    ))
                  : attrValues.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleImageOptionClick(attrName, option)}
                        className={`relative w-14 h-14 flex-shrink-0 border-2 rounded-lg overflow-hidden transition-all duration-150 ${
                          selectedAttributes[attrName] === option.value
                            ? 'border-primary ring-1 ring-primary/30 scale-105'
                            : 'border-border active:scale-95'
                        }`}
                      >
                        {option.image ? (
                          <>
                            <span className="absolute inset-0 flex items-center justify-center bg-slate-50 px-1 text-center text-[10px] font-semibold text-slate-400">
                              {option.value}
                            </span>
                            <Image
                              src={getProductDetailThumbnail(option.image)}
                              alt={option.value}
                              fill
                              className="z-10 bg-white object-cover"
                              sizes="56px"
                              referrerPolicy={getImageReferrerPolicy(getProductDetailThumbnail(option.image))}
                              onError={(event) => {
                                event.currentTarget.style.display = 'none';
                              }}
                            />
                          </>
                        ) : (
                          <span className="flex items-center justify-center h-full text-xs text-muted">
                            {option.value}
                          </span>
                        )}
                      </button>
                    ))}
              </div>
            ) : (
              <CollapsibleChipGrid
                collapsedMaxHeight={80}
                showMoreLabel={tc('showMore')}
                showLessLabel={tc('showLess')}
              >
                {attrValues.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => onAttributeChange(attrName, option.value)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-all duration-150 active:scale-95 ${
                      selectedAttributes[attrName] === option.value
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border text-foreground'
                    }`}
                  >
                    {option.value}
                  </button>
                ))}
              </CollapsibleChipGrid>
            )}
          </div>
        );
      })}
    </div>
  );
}
