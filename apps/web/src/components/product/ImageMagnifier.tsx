/**
 * 图片放大镜组件
 * - 桌面端：鼠标悬停显示侧边放大区域
 * - 移动端/桌面端：点击打开全屏查看器（支持手势缩放）
 */
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import {
  getFullResolutionUrl,
  getImageReferrerPolicy,
  getProductDetailThumbnail,
} from "@/lib/image-utils";
import ImageWithFallback, {
  PRODUCT_IMAGE_FALLBACK,
} from "@/components/ui/ImageWithFallback";

interface ImageMagnifierProps {
  images: string[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  alt: string;
  mainImageUrl: string;
}

export default function ImageMagnifier({
  images,
  currentIndex,
  onIndexChange,
  alt,
  mainImageUrl,
}: ImageMagnifierProps) {
  const t = useTranslations("product");
  const [isHovering, setIsHovering] = useState(false);
  const [lensRect, setLensRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [magnifierBg, setMagnifierBg] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [imageNaturalSize, setImageNaturalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [fullscreenZoom, setFullscreenZoom] = useState(1);
  const [fullscreenOffset, setFullscreenOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDesktop, setIsDesktop] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  useBodyScrollLock(showFullscreen);

  // 客户端挂载后检测设备类型
  useEffect(() => {
    const checkIsDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkIsDesktop();
    window.addEventListener("resize", checkIsDesktop);
    return () => window.removeEventListener("resize", checkIsDesktop);
  }, []);

  // 放大倍数
  const ZOOM_LEVEL = 2.5;
  const MAGNIFIER_SIZE = 400;

  const currentImage =
    images[currentIndex] || mainImageUrl || PRODUCT_IMAGE_FALLBACK;
  const displayedImage = imageFailed ? PRODUCT_IMAGE_FALLBACK : currentImage;

  useEffect(() => {
    setImageFailed(false);
    setImageNaturalSize(null);
    setLensRect({ x: 0, y: 0, width: 0, height: 0 });
    setMagnifierBg({ x: 0, y: 0, width: 0, height: 0 });
  }, [currentImage]);

  const showMagnifier =
    !imageFailed &&
    isDesktop &&
    isHovering &&
    lensRect.width > 0 &&
    lensRect.height > 0;

  // 处理鼠标移动（桌面端放大镜）
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!imageContainerRef.current || !isDesktop || !imageNaturalSize) return;

      const container = imageContainerRef.current;
      const rect = container.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(container);
      const paddingLeft = parseFloat(computedStyle.paddingLeft || "0");
      const paddingRight = parseFloat(computedStyle.paddingRight || "0");
      const paddingTop = parseFloat(computedStyle.paddingTop || "0");
      const paddingBottom = parseFloat(computedStyle.paddingBottom || "0");

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const innerWidth = rect.width - paddingLeft - paddingRight;
      const innerHeight = rect.height - paddingTop - paddingBottom;

      const scale = Math.min(
        innerWidth / imageNaturalSize.width,
        innerHeight / imageNaturalSize.height,
      );

      const displayWidth = imageNaturalSize.width * scale;
      const displayHeight = imageNaturalSize.height * scale;

      const imageOffsetX = paddingLeft + (innerWidth - displayWidth) / 2;
      const imageOffsetY = paddingTop + (innerHeight - displayHeight) / 2;

      const isInsideImage =
        x >= imageOffsetX &&
        x <= imageOffsetX + displayWidth &&
        y >= imageOffsetY &&
        y <= imageOffsetY + displayHeight;

      if (!isInsideImage) {
        setLensRect({ x: 0, y: 0, width: 0, height: 0 });
        setMagnifierBg({ x: 0, y: 0, width: 0, height: 0 });
        return;
      }

      const relX = x - imageOffsetX;
      const relY = y - imageOffsetY;

      const lensWidth = Math.min(MAGNIFIER_SIZE / ZOOM_LEVEL, displayWidth);
      const lensHeight = Math.min(MAGNIFIER_SIZE / ZOOM_LEVEL, displayHeight);

      const lensXInImage = Math.max(
        0,
        Math.min(relX - lensWidth / 2, displayWidth - lensWidth),
      );
      const lensYInImage = Math.max(
        0,
        Math.min(relY - lensHeight / 2, displayHeight - lensHeight),
      );

      const lensX = imageOffsetX + lensXInImage;
      const lensY = imageOffsetY + lensYInImage;

      const lensCenterX = lensXInImage + lensWidth / 2;
      const lensCenterY = lensYInImage + lensHeight / 2;

      const bgWidth = displayWidth * ZOOM_LEVEL;
      const bgHeight = displayHeight * ZOOM_LEVEL;

      const bgX = -(lensCenterX * ZOOM_LEVEL - MAGNIFIER_SIZE / 2);
      const bgY = -(lensCenterY * ZOOM_LEVEL - MAGNIFIER_SIZE / 2);

      setLensRect({ x: lensX, y: lensY, width: lensWidth, height: lensHeight });
      setMagnifierBg({ x: bgX, y: bgY, width: bgWidth, height: bgHeight });
    },
    [isDesktop, imageNaturalSize],
  );

  const handleMouseEnter = () => {
    if (isDesktop) {
      setIsHovering(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setLensRect({ x: 0, y: 0, width: 0, height: 0 });
    setMagnifierBg({ x: 0, y: 0, width: 0, height: 0 });
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onIndexChange(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onIndexChange(currentIndex === images.length - 1 ? 0 : currentIndex + 1);
  };

  // 全屏查看器
  const openFullscreen = () => {
    setShowFullscreen(true);
    setFullscreenZoom(1);
    setFullscreenOffset({ x: 0, y: 0 });
  };

  const closeFullscreen = () => {
    setShowFullscreen(false);
  };

  const handleZoomIn = () => {
    setFullscreenZoom((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setFullscreenZoom((prev) => {
      const newZoom = Math.max(prev - 0.5, 1);
      if (newZoom === 1) {
        setFullscreenOffset({ x: 0, y: 0 });
      }
      return newZoom;
    });
  };

  // 拖动图片（放大时）
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (fullscreenZoom <= 1) return;
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setDragStart({
      x: clientX - fullscreenOffset.x,
      y: clientY - fullscreenOffset.y,
    });
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || fullscreenZoom <= 1) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setFullscreenOffset({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // 键盘导航
  useEffect(() => {
    if (!showFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          closeFullscreen();
          break;
        case "ArrowLeft":
          onIndexChange(
            currentIndex === 0 ? images.length - 1 : currentIndex - 1,
          );
          break;
        case "ArrowRight":
          onIndexChange(
            currentIndex === images.length - 1 ? 0 : currentIndex + 1,
          );
          break;
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
          handleZoomOut();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showFullscreen, currentIndex, images.length, onIndexChange]);

  // 滚轮缩放
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  return (
    <div className="space-y-4">
      {/* 主图区域 + 放大区域容器 */}
      <div className="relative">
        {/* 主图容器 */}
        <div className="relative">
          <div
            ref={imageContainerRef}
            className={`relative aspect-square max-h-[70vh] lg:max-h-none bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 group p-4 ${
              imageFailed ? "cursor-default" : "cursor-zoom-in"
            }`}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={imageFailed ? undefined : openFullscreen}
          >
            <Image
              src={displayedImage}
              alt={alt}
              fill
              className="object-contain"
              priority
              unoptimized={imageFailed}
              referrerPolicy={getImageReferrerPolicy(displayedImage)}
              onError={() => setImageFailed(true)}
              onLoad={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                setImageNaturalSize({
                  width: img.naturalWidth,
                  height: img.naturalHeight,
                });
              }}
            />

            {/* 放大镜框（桌面端悬停时显示）- 使用 opacity 而非条件渲染 */}
            <div
              className={`absolute top-0 left-0 border-2 border-blue-500 bg-blue-500/20 pointer-events-none transition-opacity duration-150 ${
                showMagnifier ? "opacity-100" : "opacity-0"
              }`}
              style={{
                width: `${lensRect.width}px`,
                height: `${lensRect.height}px`,
                transform: `translate(${lensRect.x}px, ${lensRect.y}px)`,
              }}
            />

            {/* 左右箭头 */}
            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                  aria-label={t("previousImage")}
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                  aria-label={t("nextImage")}
                >
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>
              </>
            )}

            {/* 图片计数器 */}
            {images.length > 1 && (
              <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm z-10">
                {currentIndex + 1} / {images.length}
              </div>
            )}

            {/* 点击提示（移动端） */}
            <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-xs lg:hidden">
              Tap to zoom
            </div>
          </div>
        </div>

        {/* 放大区域（桌面端绝对定位在右侧，用 opacity 控制显示）*/}
        <div
          className={`hidden lg:block absolute ltr:left-full rtl:right-full top-0 ltr:ml-4 rtl:mr-4 w-[400px] h-[400px] bg-white rounded-xl overflow-hidden shadow-lg border border-gray-200 transition-opacity duration-150 z-20 ${
            showMagnifier ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <img
            src={displayedImage}
            alt=""
            aria-hidden="true"
            className="absolute max-w-none select-none pointer-events-none"
            referrerPolicy={getImageReferrerPolicy(displayedImage)}
            draggable={false}
            style={{
              width: `${magnifierBg.width}px`,
              height: `${magnifierBg.height}px`,
              transform: `translate(${magnifierBg.x}px, ${magnifierBg.y}px)`,
            }}
          />
        </div>
      </div>

      {/* 缩略图导航 */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => onIndexChange(index)}
              className={`relative flex-shrink-0 w-20 h-20 bg-white rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                currentIndex === index
                  ? "border-blue-500 ring-2 ring-blue-200"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <ImageWithFallback
                src={getProductDetailThumbnail(getFullResolutionUrl(image))}
                alt={`${alt} ${index + 1}`}
                fill
                className="z-10 bg-white object-contain p-1"
                loading="lazy"
                referrerPolicy={getImageReferrerPolicy(
                  getProductDetailThumbnail(getFullResolutionUrl(image)),
                )}
              />
            </button>
          ))}
        </div>
      )}

      {/* 全屏查看器 */}
      {showFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeFullscreen();
          }}
        >
          {/* 工具栏 */}
          <div className="absolute top-4 right-4 flex gap-2 z-10">
            <button
              onClick={handleZoomOut}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="flex items-center text-white text-sm px-2">
              {Math.round(fullscreenZoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={closeFullscreen}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors ml-2"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 图片计数 */}
          {images.length > 1 && (
            <div className="absolute top-4 left-4 text-white text-sm z-10">
              {currentIndex + 1} / {images.length}
            </div>
          )}

          {/* 主图区域 */}
          <div
            className="relative w-full h-full flex items-center justify-center overflow-hidden"
            onWheel={handleWheel}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
            style={{ cursor: fullscreenZoom > 1 ? "grab" : "default" }}
          >
            <div
              className="relative transition-transform duration-100"
              style={{
                transform: `scale(${fullscreenZoom}) translate(${fullscreenOffset.x / fullscreenZoom}px, ${fullscreenOffset.y / fullscreenZoom}px)`,
                maxWidth: "90vw",
                maxHeight: "90vh",
              }}
            >
              {}
              <img
                src={getFullResolutionUrl(displayedImage)}
                alt={alt}
                className="max-w-[90vw] max-h-[90vh] object-contain select-none"
                draggable={false}
                referrerPolicy={getImageReferrerPolicy(
                  getFullResolutionUrl(displayedImage),
                )}
              />
            </div>
          </div>

          {/* 左右切换按钮 */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onIndexChange(
                    currentIndex === 0 ? images.length - 1 : currentIndex - 1,
                  );
                  setFullscreenZoom(1);
                  setFullscreenOffset({ x: 0, y: 0 });
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors z-10 cursor-pointer"
                aria-label={t("previousImage")}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onIndexChange(
                    currentIndex === images.length - 1 ? 0 : currentIndex + 1,
                  );
                  setFullscreenZoom(1);
                  setFullscreenOffset({ x: 0, y: 0 });
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors z-10 cursor-pointer"
                aria-label={t("nextImage")}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* 缩略图条（底部） */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 p-2 rounded-lg z-10 max-w-[90vw] overflow-x-auto">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    onIndexChange(index);
                    setFullscreenZoom(1);
                    setFullscreenOffset({ x: 0, y: 0 });
                  }}
                  className={`relative flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-all ${
                    currentIndex === index
                      ? "border-white"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <ImageWithFallback
                    src={getProductDetailThumbnail(getFullResolutionUrl(image))}
                    alt={`${alt} ${index + 1}`}
                    fill
                    className="object-cover"
                    referrerPolicy={getImageReferrerPolicy(
                      getProductDetailThumbnail(getFullResolutionUrl(image)),
                    )}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
