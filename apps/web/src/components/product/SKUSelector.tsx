"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Alert } from "@/components/ui/Alert";
import { useTranslations } from "next-intl";
import {
  isInvalidAttribute,
  isSizeValue,
  isSizeAttributeName,
  isColorAttributeName,
  parseSkuAttributes,
  getAttributePriority,
  type AttributeOption,
} from "@/lib/sku-utils";
import { getImageReferrerPolicy, getImageVariant } from "@/lib/image-utils";
import type { SKU } from "@/types";

interface SKUSelectorProps {
  skus: SKU[] | null | undefined;
  productImages: string[] | null | undefined;
  selectedAttributes: Record<string, string>;
  onAttributeChange: (attrName: string, value: string) => void;
  onImageSelect?: (index: number) => void;
  currentImageIndex?: number;
  selectedSku: SKU | null;
  hideStock?: boolean;
  sizeOnly?: boolean;
}

export default function SKUSelector({
  skus,
  productImages,
  selectedAttributes,
  onAttributeChange,
  onImageSelect,
  currentImageIndex = 0,
  selectedSku,
  hideStock = false,
  sizeOnly = false,
}: SKUSelectorProps) {
  const t = useTranslations("product");
  const [isStyleExpanded, setIsStyleExpanded] = useState(false);

  // 从 SKU 数据中提取所有属性选项
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

    const filteredOptions: Record<string, AttributeOption[]> = {};
    for (const [key, values] of Object.entries(options)) {
      const isSizeAttribute =
        isSizeAttributeName(key) ||
        (!isColorAttributeName(key) && values.every((item) => isSizeValue(item.value)));
      if (sizeOnly && !isSizeAttribute) continue;
      if (values.length > 0) {
        // 按图片在 productImages 中的位置排序，保证与后台拖拽排序一致
        if (productImages && productImages.length > 0) {
          values.sort((a, b) => {
            const idxA = a.image ? productImages.indexOf(a.image) : -1;
            const idxB = b.image ? productImages.indexOf(b.image) : -1;
            if (idxA === -1 && idxB === -1) return 0;
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
          });
        }
        filteredOptions[key] = values;
      }
    }

    const hasNonSizeAttr = Object.keys(filteredOptions).some(
      (key) => !isSizeAttributeName(key)
    );

    if (!hasNonSizeAttr && productImages && productImages.length > 1) {
      filteredOptions[t("style")] = productImages.map((img, index) => ({
        value: t("styleN", { n: index + 1 }),
        image: img,
      }));
    }

    return filteredOptions;
  }, [productImages, sizeOnly, skus, t]);

  if (Object.keys(attributeOptions).length === 0) {
    return (
      <Alert
        type="warning"
        title={t("skuNotAvailable")}
        description={t("contactSeller")}
      />
    );
  }

  // 排序后的属性条目
  const sortedEntries = Object.entries(attributeOptions).sort(
    ([nameA, valuesA], [nameB, valuesB]) => {
      const aHasImages = valuesA.some((v) => v.image);
      const bHasImages = valuesB.some((v) => v.image);
      const aIsColorAttr = isColorAttributeName(nameA);
      const bIsColorAttr = isColorAttributeName(nameB);
      const aIsSize =
        !aIsColorAttr &&
        (valuesA.every((v) => isSizeValue(v.value)) || isSizeAttributeName(nameA));
      const bIsSize =
        !bIsColorAttr &&
        (valuesB.every((v) => isSizeValue(v.value)) || isSizeAttributeName(nameB));
      return getAttributePriority(aHasImages, aIsSize) - getAttributePriority(bHasImages, bIsSize);
    }
  );

  return (
    <div className="space-y-4">
      {sortedEntries.map(([attrName, attrValues]) => {
        const isColorAttr = isColorAttributeName(attrName);
        const isSizeByName = isSizeAttributeName(attrName);
        const isSizeByValue =
          !isColorAttr && attrValues.length > 0 && attrValues.every((v) => isSizeValue(v.value));
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
          (productImages?.length || 0) > 1 &&
          isFirstNonSizeAttr;
        const showAsImages = !isSizeAttribute && (hasSkuImages || canFallbackToProductImages);
        const useFallbackImages = canFallbackToProductImages && !hasSkuImages;

        const displayImages = useFallbackImages ? productImages || [] : attrValues;
        const totalOptions = useFallbackImages ? displayImages.length : attrValues.length;
        const showExpandButton = showAsImages && totalOptions > 24;
        const optionsToShow = isStyleExpanded ? totalOptions : Math.min(24, totalOptions);

        // Display translated label based on attribute type
        const displayLabel = isSizeAttribute
          ? t("size")
          : isColorAttr || hasSkuImages || canFallbackToProductImages
            ? t("style")
            : attrName;

        return (
          <div key={attrName}>
            <div className="font-medium mb-2 text-gray-600 text-sm">{displayLabel}</div>
            {showAsImages ? (
              <ImageOptionGrid
                useFallbackImages={useFallbackImages}
                productImages={productImages || []}
                attrValues={attrValues}
                attrName={attrName}
                optionsToShow={optionsToShow}
                currentImageIndex={currentImageIndex}
                selectedAttributes={selectedAttributes}
                onImageSelect={onImageSelect}
                onAttributeChange={onAttributeChange}
                isStyleExpanded={isStyleExpanded}
              />
            ) : (
              <TextOptionGrid
                attrValues={attrValues}
                attrName={attrName}
                selectedAttributes={selectedAttributes}
                onAttributeChange={onAttributeChange}
              />
            )}
            {showExpandButton && (
              <button
                onClick={() => setIsStyleExpanded(!isStyleExpanded)}
                className="mt-2 text-xs text-blue-600 hover:text-blue-700 hover:underline"
              >
                {isStyleExpanded ? t("collapseOptions") : t("viewAllOptions", { count: totalOptions })}
              </button>
            )}
          </div>
        );
      })}
      {selectedSku && !hideStock && (
        <div className="text-sm text-gray-600">
          {t("stockAvailable", { count: selectedSku.stock || 0 })}
        </div>
      )}
    </div>
  );
}

// 图片选项网格组件
interface ImageOptionGridProps {
  useFallbackImages: boolean;
  productImages: string[];
  attrValues: AttributeOption[];
  attrName: string;
  optionsToShow: number;
  currentImageIndex: number;
  selectedAttributes: Record<string, string>;
  onImageSelect?: (index: number) => void;
  onAttributeChange: (attrName: string, value: string) => void;
  isStyleExpanded: boolean;
}

function ImageOptionGrid({
  useFallbackImages,
  productImages,
  attrValues,
  attrName,
  optionsToShow,
  currentImageIndex,
  selectedAttributes,
  onImageSelect,
  onAttributeChange,
  isStyleExpanded,
}: ImageOptionGridProps) {
  const t = useTranslations("product");
  if (useFallbackImages) {
    return (
      <div
        className={`flex gap-1 lg:flex-wrap overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 ${isStyleExpanded ? "lg:max-h-[230px] lg:overflow-y-auto lg:pr-1" : ""}`}
      >
        {productImages.slice(0, optionsToShow).map((image, index) => (
          <button
            key={index}
            onClick={() => onImageSelect?.(index)}
            className={`relative w-[70px] h-[70px] flex-shrink-0 border-2 rounded overflow-hidden transition-all duration-200 cursor-pointer ${
              currentImageIndex === index
                ? "border-blue-500 ring-2 ring-blue-200 shadow-lg scale-105"
                : "border-gray-200 hover:border-gray-400 hover:shadow-md hover:scale-105"
            }`}
            title={t("styleN", { n: index + 1 })}
            aria-label={t("styleN", { n: index + 1 })}
          >
            <span className="absolute inset-0 flex items-center justify-center bg-slate-50 text-xs font-semibold text-slate-400">
              {index + 1}
            </span>
            <Image
              src={getImageVariant(image, 80)}
              alt={t("styleN", { n: index + 1 })}
              fill
              className="z-10 bg-white object-cover"
              referrerPolicy={getImageReferrerPolicy(getImageVariant(image, 80))}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`flex gap-1 lg:flex-wrap overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 ${isStyleExpanded ? "lg:max-h-[230px] lg:overflow-y-auto lg:pr-1" : ""}`}
    >
      {attrValues.slice(0, optionsToShow).map((option) => (
        <button
          key={option.value}
          onClick={() => {
            onAttributeChange(attrName, option.value);
            if (option.image && onImageSelect) {
              const imageIndex = productImages?.findIndex((img) => img === option.image);
              if (imageIndex !== undefined && imageIndex >= 0) {
                onImageSelect(imageIndex);
              }
            }
          }}
          className={`relative w-[70px] h-[70px] flex-shrink-0 border-2 rounded overflow-hidden transition-all duration-200 cursor-pointer ${
            selectedAttributes[attrName] === option.value
              ? "border-blue-500 ring-2 ring-blue-200 shadow-lg scale-105"
              : "border-gray-200 hover:border-gray-400 hover:shadow-md hover:scale-105"
          }`}
          title={option.value}
          aria-label={option.value}
        >
          {option.image ? (
            <>
              <span className="absolute inset-0 flex items-center justify-center bg-slate-50 px-1 text-center text-[10px] font-semibold text-slate-400">
                {option.value}
              </span>
              <Image
                src={getImageVariant(option.image, 80)}
                alt={option.value}
                fill
                className="z-10 bg-white object-cover"
                referrerPolicy={getImageReferrerPolicy(getImageVariant(option.image, 80))}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </>
          ) : (
            <span className="flex items-center justify-center h-full text-xs text-gray-500">
              {option.value}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// 文字选项网格组件
interface TextOptionGridProps {
  attrValues: AttributeOption[];
  attrName: string;
  selectedAttributes: Record<string, string>;
  onAttributeChange: (attrName: string, value: string) => void;
}

function TextOptionGrid({
  attrValues,
  attrName,
  selectedAttributes,
  onAttributeChange,
}: TextOptionGridProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {attrValues.map((option) => {
        const textLength = option.value.length;
        const fontSizeClass =
          textLength > 25 ? "text-[10px]" : textLength > 15 ? "text-xs" : "text-sm";
        const paddingClass =
          textLength > 25 ? "px-1.5 py-1.5" : textLength > 15 ? "px-2 py-1.5" : "px-3 py-2";

        return (
          <button
            key={option.value}
            onClick={() => onAttributeChange(attrName, option.value)}
            className={`border-2 rounded min-h-[36px] flex items-center justify-center text-center leading-tight transition-all whitespace-nowrap cursor-pointer ${fontSizeClass} ${paddingClass} ${
              selectedAttributes[attrName] === option.value
                ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                : "border-gray-200 hover:border-gray-300 text-gray-700"
            }`}
          >
            {option.value}
          </button>
        );
      })}
    </div>
  );
}
