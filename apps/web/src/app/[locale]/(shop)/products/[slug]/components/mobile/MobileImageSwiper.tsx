'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { getImageReferrerPolicy, getProductDetailMainImage } from '@/lib/image-utils';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface MobileImageSwiperProps {
  images: string[];
  alt: string;
  mainImageUrl: string;
  /** 外部驱动：父组件可通过此 prop 让轮播滚动到指定图片 */
  selectedIndex?: number;
  /** 轮播切换时通知父组件当前 index */
  onIndexChange?: (index: number) => void;
}

/**
 * 移动端商品图片轮播（Section 6.3）
 *
 * 功能：
 * - 全宽 Swiper 轮播，左右滑动切换
 * - 底部指示器小圆点
 * - 点击全屏预览（带左右滑动）
 * - 父组件可通过 selectedIndex 驱动滚动（SKU 选择联动）
 */
export default function MobileImageSwiper({
  images,
  alt,
  mainImageUrl,
  selectedIndex,
  onIndexChange,
}: MobileImageSwiperProps) {
  const allImages = images.length > 0 ? images : [mainImageUrl];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  useBodyScrollLock(isFullscreen);

  // 主轮播
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  // 全屏轮播
  const [fullscreenRef, fullscreenApi] = useEmblaCarousel({
    loop: true,
    startIndex: currentIndex,
  });

  // 防止 selectedIndex 外部驱动与用户滑动产生冲突的标记
  const isExternalScroll = useRef(false);

  // 监听主轮播滑动（用户手动滑动时更新 index）
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const idx = emblaApi.selectedScrollSnap();
    setCurrentIndex(idx);
    if (!isExternalScroll.current) {
      onIndexChange?.(idx);
    }
    isExternalScroll.current = false;
  }, [emblaApi, onIndexChange]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  // 外部 selectedIndex 变化时驱动轮播滚动
  useEffect(() => {
    if (
      selectedIndex !== undefined &&
      selectedIndex >= 0 &&
      selectedIndex < allImages.length &&
      emblaApi &&
      selectedIndex !== emblaApi.selectedScrollSnap()
    ) {
      isExternalScroll.current = true;
      emblaApi.scrollTo(selectedIndex);
      setCurrentIndex(selectedIndex);
    }
  }, [selectedIndex, emblaApi, allImages.length]);

  // 打开全屏时同步到当前图片
  useEffect(() => {
    if (isFullscreen && fullscreenApi) {
      fullscreenApi.scrollTo(currentIndex, true);
    }
  }, [isFullscreen, fullscreenApi, currentIndex]);

  // 全屏轮播切换时同步 index
  const onFullscreenSelect = useCallback(() => {
    if (!fullscreenApi) return;
    const idx = fullscreenApi.selectedScrollSnap();
    setCurrentIndex(idx);
  }, [fullscreenApi]);

  useEffect(() => {
    if (!fullscreenApi) return;
    fullscreenApi.on('select', onFullscreenSelect);
    return () => { fullscreenApi.off('select', onFullscreenSelect); };
  }, [fullscreenApi, onFullscreenSelect]);

  return (
    <>
      {/* 主轮播 */}
      <div className="relative w-full">
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {allImages.map((img, index) => (
              <div
                key={index}
                className="relative flex-[0_0_100%] min-w-0 aspect-square cursor-pointer"
                onClick={() => setIsFullscreen(true)}
              >
                <Image
                  src={getProductDetailMainImage(img)}
                  alt={`${alt} - ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="100vw"
                  priority={index === 0}
                  referrerPolicy={getImageReferrerPolicy(getProductDetailMainImage(img))}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 指示器小圆点 — 超过 8 张只显示计数 */}
        {allImages.length > 1 && allImages.length <= 8 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {allImages.map((_, index) => (
              <span
                key={index}
                className={`block rounded-full transition-all duration-200 ${
                  index === currentIndex
                    ? 'w-4 h-1.5 bg-white'
                    : 'w-1.5 h-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>
        )}

        {/* 图片计数 */}
        {allImages.length > 1 && (
          <div className="absolute bottom-3 right-3 rtl:left-3 rtl:right-auto bg-black/40 text-white text-xs px-2 py-0.5 rounded-full">
            {currentIndex + 1}/{allImages.length}
          </div>
        )}
      </div>

      {/* 全屏预览 */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            className="fixed inset-0 z-40 bg-black flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* 关闭按钮 */}
            <div className="absolute top-0 right-0 rtl:left-0 rtl:right-auto z-10 p-4 pt-[calc(env(safe-area-inset-top)+16px)]">
              <button
                onClick={() => setIsFullscreen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 text-white active:bg-white/30"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 全屏轮播 */}
            <div className="flex-1 flex items-center" ref={fullscreenRef}>
              <div className="flex w-full">
                {allImages.map((img, index) => (
                  <div
                    key={index}
                    className="relative flex-[0_0_100%] min-w-0 h-dvh flex items-center justify-center"
                  >
                    <Image
                      src={img}
                      alt={`${alt} - ${index + 1}`}
                      fill
                      className="object-contain"
                      sizes="100vw"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 全屏计数 */}
            <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+16px)] left-1/2 -translate-x-1/2 text-white/80 text-sm">
              {currentIndex + 1} / {allImages.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
