"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import type { ProductQcMedia } from "@/types/product";
import { Button } from "@/components/ui/Button";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import {
  getImageVariant,
  getProductDetailThumbnail,
} from "@/lib/image-utils";

const VIDEO_PREVIEW_PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'><rect width='240' height='240' rx='28' fill='%23eef2f7'/><circle cx='120' cy='120' r='42' fill='white' fill-opacity='0.96'/><path d='M109 98l35 22-35 22z' fill='%231f2937'/></svg>";

interface ProductTabsProps {
  description?: string | null;
  attributes?: Record<string, string | number | boolean> | null;
  qcMedia?: ProductQcMedia[] | null;
  qcPhotos?: ProductQcMedia[] | null;
}

type TabKey = "description" | "attributes" | "qc";

export default function ProductTabs({
  description,
  attributes,
  qcMedia,
  qcPhotos,
}: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("qc");
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewImageLoaded, setPreviewImageLoaded] = useState(false);
  const thumbnailRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const previewTouchStart = useRef<{ x: number; y: number } | null>(null);
  const t = useTranslations("product");
  const tc = useTranslations("common");
  useBodyScrollLock(previewIndex !== null);

  const sanitizedDescription = useMemo(() => {
    if (!description) return "";
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const DOMPurify = require('isomorphic-dompurify');
      return (DOMPurify.default || DOMPurify).sanitize(description);
    } catch {
      return description;
    }
  }, [description]);

  const normalizedQcMedia = useMemo(
    () =>
      (qcMedia || qcPhotos || [])
        .filter((media) => Boolean(media?.url))
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((media) => ({
          ...media,
          type: media.type === "video" ? "video" : "image",
          previewUrl:
            media.type === "video"
              ? media.posterUrl
                ? getImageVariant(media.posterUrl, 360)
                : VIDEO_PREVIEW_PLACEHOLDER
              : getImageVariant(media.url, 360),
          modalUrl: media.type === "video" ? media.url : getImageVariant(media.url, 1200),
          thumbnailUrl:
            media.type === "video"
              ? media.posterUrl
                ? getProductDetailThumbnail(media.posterUrl)
                : VIDEO_PREVIEW_PLACEHOLDER
              : getProductDetailThumbnail(media.url),
        })),
    [qcMedia, qcPhotos],
  );
  const previewPhotoCount = 5;
  const previewQcMedia = normalizedQcMedia.slice(0, previewPhotoCount);
  const hiddenQcPhotoCount = Math.max(
    0,
    normalizedQcMedia.length - previewPhotoCount,
  );

  useEffect(() => {
    if (previewIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewIndex(null);
        return;
      }

      if (normalizedQcMedia.length <= 1) return;

      if (event.key === "ArrowLeft") {
        setPreviewIndex((prev) =>
          prev === null
            ? 0
            : prev === 0
              ? normalizedQcMedia.length - 1
              : prev - 1,
        );
      }

      if (event.key === "ArrowRight") {
        setPreviewIndex((prev) =>
          prev === null
            ? 0
            : prev === normalizedQcMedia.length - 1
              ? 0
              : prev + 1,
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewIndex, normalizedQcMedia.length]);

  useEffect(() => {
    if (previewIndex === null) return;
    const activeThumbnail = thumbnailRefs.current[previewIndex];
    if (!activeThumbnail || typeof activeThumbnail.scrollIntoView !== "function") {
      return;
    }

    activeThumbnail.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: "smooth",
    });
  }, [previewIndex]);

  useEffect(() => {
    if (previewIndex === null) {
      setPreviewImageLoaded(false);
      return;
    }

    setPreviewImageLoaded(false);
  }, [previewIndex]);

  useEffect(() => {
    if (previewIndex === null || normalizedQcMedia.length <= 1) {
      return;
    }

    const previousIndex =
      previewIndex === 0 ? normalizedQcMedia.length - 1 : previewIndex - 1;
    const nextIndex =
      previewIndex === normalizedQcMedia.length - 1 ? 0 : previewIndex + 1;

    [normalizedQcMedia[previousIndex]?.modalUrl, normalizedQcMedia[nextIndex]?.modalUrl]
      .filter((url): url is string => Boolean(url))
      .forEach((url) => {
        if (url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".mov")) {
          const video = document.createElement("video");
          video.preload = "metadata";
          video.src = url;
          return;
        }

        const image = new window.Image();
        image.decoding = "async";
        image.src = url;
      });
  }, [previewIndex, normalizedQcMedia]);

  const showPreviousPreview = () => {
    setPreviewIndex((prev) =>
      prev === null
        ? 0
        : prev === 0
          ? normalizedQcMedia.length - 1
          : prev - 1,
    );
  };

  const showNextPreview = () => {
    setPreviewIndex((prev) =>
      prev === null
        ? 0
        : prev === normalizedQcMedia.length - 1
          ? 0
          : prev + 1,
    );
  };

  const handlePreviewTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    previewTouchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handlePreviewTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    const start = previewTouchStart.current;
    previewTouchStart.current = null;
    if (!start || normalizedQcMedia.length <= 1) return;

    const touch = event.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    if (deltaX < 0) {
      showNextPreview();
      return;
    }

    showPreviousPreview();
  };

  const tabs = [
    { key: "qc" as const, label: t("tabQcPhotos") },
    { key: "description" as const, label: t("tabDescription") },
    { key: "attributes" as const, label: t("tabAttributes") },
  ];

  return (
    <div>
      {/* Tab 导航 */}
      <div className="flex border-b border-border" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-3 text-sm font-medium transition-colors duration-200 cursor-pointer border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground hover:border-border"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      <div className="py-6">
        {activeTab === "description" && (
          <div className="prose max-w-none">
            {description ? (
              <div dangerouslySetInnerHTML={{ __html: sanitizedDescription }} />
            ) : (
              <p className="text-muted">{t("noDescription")}</p>
            )}
          </div>
        )}

        {activeTab === "attributes" && (
          <div className="grid md:grid-cols-2 gap-4">
            {attributes &&
              Object.entries(attributes).map(([key, value]) => (
                <div key={key} className="flex justify-between border-b border-border pb-2">
                  <span className="font-medium text-foreground">{key}:</span>
                  <span className="text-muted">{String(value)}</span>
                </div>
              ))}
            {(!attributes || Object.keys(attributes).length === 0) && (
              <p className="text-muted">{t("noAttributes")}</p>
            )}
          </div>
        )}

        {activeTab === "qc" && (
          normalizedQcMedia.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {t("tabQcPhotos")}
                    </p>
                    <span className="text-sm text-muted">
                      {normalizedQcMedia.length}
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    {tc("viewAll")} {normalizedQcMedia.length}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPreviewIndex(0)}
                >
                  {tc("viewAll")}
                </Button>
              </div>

              <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-3 md:overflow-visible lg:grid-cols-5 xl:grid-cols-6">
                  {previewQcMedia.map((media, index) => (
                    <button
                      key={`${media.url}-${index}`}
                      type="button"
                      onClick={() => setPreviewIndex(index)}
                      className="group relative block w-[42vw] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-md sm:w-52 md:w-auto md:shrink"
                    >
                      {media.type === "video" ? (
                        <>
                          <video
                            src={media.modalUrl}
                            poster={media.posterUrl || media.previewUrl}
                            preload="metadata"
                            muted
                            playsInline
                            className="aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                          />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm">
                              <Play className="ml-0.5 h-5 w-5 fill-current" />
                            </span>
                          </span>
                        </>
                      ) : (
                        <img
                          src={media.previewUrl}
                          alt={`QC Photo ${index + 1}`}
                          loading="lazy"
                          decoding="async"
                          className="aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                        />
                      )}
                    </button>
                  ))}

                  {hiddenQcPhotoCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setPreviewIndex(previewPhotoCount)}
                    aria-label={`${tc("viewAll")} ${normalizedQcMedia.length}`}
                    className="group relative flex aspect-square w-[42vw] shrink-0 snap-start flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(241,245,249,0.88))] px-4 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md sm:w-52 md:w-auto md:shrink"
                  >
                      <div
                        className="absolute inset-x-0 top-0 h-1/2 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),transparent_70%)]"
                        aria-hidden="true"
                      />
                      <span className="relative mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-foreground shadow-sm transition-transform duration-200 group-hover:translate-x-0.5">
                        <ChevronRight className="h-5 w-5" />
                      </span>
                      <span className="relative text-sm font-semibold text-foreground">
                        {tc("viewAll")}
                      </span>
                      <span className="relative mt-1 text-xs text-muted">
                        {normalizedQcMedia.length}
                      </span>
                      <span className="relative mt-2 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm">
                        +{hiddenQcPhotoCount}
                      </span>
                    </button>
                  )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted">{t("qcPhotosPlaceholder")}</p>
            </div>
          )
        )}
      </div>
      {previewIndex !== null && normalizedQcMedia[previewIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setPreviewIndex(null);
            }
          }}
        >
          <button
            type="button"
            onClick={() => setPreviewIndex(null)}
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
            aria-label="Close QC preview"
          >
            <X className="h-5 w-5" />
          </button>

          {normalizedQcMedia.length > 1 && (
            <>
              <button
                type="button"
                onClick={showPreviousPreview}
                className="absolute left-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
                aria-label={t("previousImage")}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={showNextPreview}
                className="absolute right-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
                aria-label={t("nextImage")}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <div className="absolute left-4 top-4 z-10 rounded-full bg-black/40 px-3 py-1 text-sm text-white">
            {previewIndex + 1} / {normalizedQcMedia.length}
          </div>

          {normalizedQcMedia[previewIndex].type === "video" ? (
            <video
              key={normalizedQcMedia[previewIndex].modalUrl}
              src={normalizedQcMedia[previewIndex].modalUrl}
              poster={normalizedQcMedia[previewIndex].posterUrl || normalizedQcMedia[previewIndex].previewUrl}
              controls
              autoPlay
              playsInline
              preload="metadata"
              onLoadedData={() => setPreviewImageLoaded(true)}
              onTouchStart={handlePreviewTouchStart}
              onTouchEnd={handlePreviewTouchEnd}
              className={`max-h-[76vh] max-w-[88vw] object-contain transition-opacity duration-200 ${
                previewImageLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : (
            <img
              key={normalizedQcMedia[previewIndex].modalUrl}
              src={normalizedQcMedia[previewIndex].modalUrl}
              alt={`QC Photo ${previewIndex + 1}`}
              decoding="async"
              onLoad={() => setPreviewImageLoaded(true)}
              onTouchStart={handlePreviewTouchStart}
              onTouchEnd={handlePreviewTouchEnd}
              className={`max-h-[76vh] max-w-[88vw] object-contain transition-opacity duration-200 ${
                previewImageLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          )}

          {normalizedQcMedia.length > 1 && (
            <div className="absolute bottom-4 left-1/2 z-10 w-[min(92vw,760px)] -translate-x-1/2">
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto rounded-2xl bg-black/35 px-3 py-3 backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {normalizedQcMedia.map((media, index) => (
                  <button
                    key={`${media.url}-thumb-${index}`}
                    ref={(node) => {
                      thumbnailRefs.current[index] = node;
                    }}
                    type="button"
                    onClick={() => setPreviewIndex(index)}
                    className={`shrink-0 snap-start overflow-hidden rounded-xl border transition-all ${
                      previewIndex === index
                        ? "border-white shadow-[0_0_0_1px_rgba(255,255,255,0.65)]"
                        : "border-white/15 opacity-70 hover:opacity-100"
                    }`}
                    aria-label={`QC thumbnail ${index + 1}`}
                  >
                    {media.type === "video" ? (
                      <div className="relative">
                        <video
                          src={media.modalUrl}
                          poster={media.posterUrl || media.thumbnailUrl}
                          preload="metadata"
                          muted
                          playsInline
                          className="h-14 w-14 object-cover sm:h-16 sm:w-16"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                          <Play className="ml-0.5 h-4 w-4 fill-white text-white" />
                        </span>
                      </div>
                    ) : (
                      <img
                        src={media.thumbnailUrl}
                        alt={`QC thumbnail ${index + 1}`}
                        loading="lazy"
                        decoding="async"
                        className="h-14 w-14 object-cover sm:h-16 sm:w-16"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
