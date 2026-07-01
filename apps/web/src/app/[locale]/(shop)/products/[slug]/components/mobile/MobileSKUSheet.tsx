'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { MobileSheet } from '@/components/mobile/ui/MobileSheet';
import { getImageReferrerPolicy, getProductDetailThumbnail } from '@/lib/image-utils';
import { formatPrice, convertPrice } from '@/lib/utils';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
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

interface MobileSKUSheetProps {
  open: boolean;
  onClose: () => void;
  skus: SKU[] | null | undefined;
  productImages: string[];
  mainImage: string;
  selectedAttributes: Record<string, string>;
  onAttributeChange: (attrName: string, value: string) => void;
  /** SKU 图片选中时，回传对应 productImages 中的 index，驱动主轮播联动 */
  onImageSelect?: (index: number) => void;
  currentImageIndex?: number;
  selectedSku: SKU | null;
  currentPrice: number;
  currency: string;
  sizeOnly?: boolean;
}

/**
 * 移动端 SKU 选择 Sheet（Section 6.3）
 *
 * 改进：
 * - 图片选项改为单行横向滚动（参考淘宝/SHEIN），不再 flex-wrap 全铺开
 * - 选中 SKU 图片时，通过 onImageSelect 回调驱动主轮播大图联动
 */
export default function MobileSKUSheet({
  open,
  onClose,
  skus,
  productImages,
  mainImage,
  selectedAttributes,
  onAttributeChange,
  onImageSelect,
  currentImageIndex = 0,
  selectedSku,
  currentPrice,
  currency,
  sizeOnly = false,
}: MobileSKUSheetProps) {
  const t = useTranslations('product');
  const tc = useTranslations('common');
  const { currency: displayCurrency, rates } = useCurrencyStore();

  const isConverted = displayCurrency !== currency;
  const approx = isConverted ? '≈ ' : '';
  const converted = convertPrice(currentPrice, currency, displayCurrency, rates);

  // 当前展示图片：选中 SKU 图片 > 主图
  const displayImage =
    selectedSku?.image || selectedSku?.imageUrl || mainImage;

  // 从 SKU 数据中提取属性选项
  const attributeOptions = useMemo(() => {
    if (!skus || skus.length === 0) return {};

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
      if (values.length > 0) {
        filtered[key] = values;
      }
    }
    return filtered;
  }, [sizeOnly, skus]);

  // Sort: images first, then non-size, then size
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

  // 选中图片选项时，找到对应 productImages 的 index 并回调
  const handleImageOptionClick = (attrName: string, option: AttributeOption) => {
    onAttributeChange(attrName, option.value);
    if (option.image && onImageSelect && productImages.length > 0) {
      const imageIndex = productImages.findIndex((img) => img === option.image);
      if (imageIndex >= 0) {
        onImageSelect(imageIndex);
      }
    }
  };

  return (
    <MobileSheet open={open} onClose={onClose} maxHeight="85vh">
      <div className="pb-6">
        {/* 顶部商品信息区 */}
        <div className="flex gap-3 pb-4 border-b border-border">
          {/* 缩略图 */}
          <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
            <Image
              src={getProductDetailThumbnail(displayImage)}
              alt=""
              fill
              className="object-cover"
              sizes="80px"
              referrerPolicy={getImageReferrerPolicy(getProductDetailThumbnail(displayImage))}
            />
          </div>

          {/* 价格和库存 */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="text-xl font-bold text-accent">
              {approx}{formatPrice(converted, displayCurrency)}
            </div>
            {selectedSku && (
              <div className="text-sm text-muted mt-1">
                {t('stockAvailable', { count: selectedSku.stock || 0 })}
              </div>
            )}
          </div>
        </div>

        {/* 属性选择区 */}
        <div className="space-y-5 pt-4">
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
                <div className="text-sm font-medium text-foreground mb-2.5">
                  {displayLabel}
                  {selectedAttributes[attrName] && (
                    <span className="text-muted font-normal ml-2 rtl:mr-2 rtl:ml-0">
                      {selectedAttributes[attrName]}
                    </span>
                  )}
                </div>

                {showAsImages ? (
                  /* 图片选项 — 单行横向滚动（参考淘宝/SHEIN） */
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {useFallbackImages
                      ? productImages.map((image, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              onImageSelect?.(index);
                            }}
                            className={`relative w-16 h-16 flex-shrink-0 border-2 rounded-lg overflow-hidden transition-all duration-150 ${
                              currentImageIndex === index
                                ? 'border-primary ring-1 ring-primary/30 scale-105'
                                : 'border-border active:scale-95'
                            }`}
                          >
                            <Image
                              src={getProductDetailThumbnail(image)}
                              alt={t('styleN', { n: index + 1 })}
                              fill
                              className="object-cover"
                              sizes="64px"
                              referrerPolicy={getImageReferrerPolicy(getProductDetailThumbnail(image))}
                            />
                          </button>
                        ))
                      : attrValues.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => handleImageOptionClick(attrName, option)}
                            className={`relative w-16 h-16 flex-shrink-0 border-2 rounded-lg overflow-hidden transition-all duration-150 ${
                              selectedAttributes[attrName] === option.value
                                ? 'border-primary ring-1 ring-primary/30 scale-105'
                                : 'border-border active:scale-95'
                            }`}
                          >
                            {option.image ? (
                              <Image
                                src={getProductDetailThumbnail(option.image)}
                                alt={option.value}
                                fill
                                className="object-cover"
                                sizes="64px"
                                referrerPolicy={getImageReferrerPolicy(getProductDetailThumbnail(option.image))}
                              />
                            ) : (
                              <span className="flex items-center justify-center h-full text-xs text-muted">
                                {option.value}
                              </span>
                            )}
                          </button>
                        ))}
                  </div>
                ) : (
                  /* 文字选项 — flex-wrap + 折叠 */
                  <CollapsibleChipGrid
                    collapsedMaxHeight={88}
                    showMoreLabel={tc('showMore')}
                    showLessLabel={tc('showLess')}
                  >
                    {attrValues.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => onAttributeChange(attrName, option.value)}
                        className={`px-3 py-2 text-sm rounded-lg border transition-all duration-150 active:scale-95 ${
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

        {/* 确定按钮 */}
        <button
          onClick={onClose}
          className="mt-6 w-full h-12 bg-primary text-white font-semibold rounded-xl active:scale-[0.98] transition-transform duration-150"
        >
          {tc('confirm')}
        </button>
      </div>
    </MobileSheet>
  );
}
