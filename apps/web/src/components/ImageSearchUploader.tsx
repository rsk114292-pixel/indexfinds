'use client';
import { API_BASE_URL } from '@/lib/constants';

import { useState, useCallback, useEffect } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { Modal, Upload, App } from 'antd';
import { Camera, X, Inbox, Clipboard, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Empty } from '@/components/ui/Empty';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import type { RcFile } from 'antd/es/upload';
import ImageCropper from './ImageCropper';
import { setPageSource, OutboundSource } from '@/lib/search-tracking';
import { convertPrice, formatPriceRange } from '@/lib/utils';
import { getImageReferrerPolicy, getImageVariant } from '@/lib/image-utils';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import { buildReturnTo, withReturnTo } from '@/lib/return-to';
import { saveReturnScroll } from '@/lib/return-scroll';


interface VisualSearchResult {
  product: {
    id: string;
    title: string;
    slug: string;
    mainImage: string;
    images: string[];
    priceMin: number;
    priceMax: number;
    currency?: string;
  };
  similarity: number;
  matchedImage?: string; // 匹配到的图片URL（可能是SKU图）
}

interface ImageSearchUploaderProps {
  /** 按钮样式变体 */
  variant?: 'icon' | 'button' | 'text' | 'inline';
  /** 自定义类名 */
  className?: string;
}

export default function ImageSearchUploader({
  variant = 'icon',
  className = '',
}: ImageSearchUploaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const t = useTranslations('visualSearch');
  const { currency: displayCurrency, rates } = useCurrencyStore();
  const returnTo = buildReturnTo(pathname, searchParams);
  const [isModalOpen, setIsModalOpen] = useState(false);

  /** 打开 Modal 前先 blur 当前焦点元素，避免 SearchBox 下拉框浮在 Modal 之上 */
  const openModal = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsModalOpen(true);
  }, []);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [results, setResults] = useState<VisualSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  /**
   * 处理图片文件（上传或粘贴）
   */
  const processImage = useCallback(async (file: File) => {
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      message.error(t('invalidFileType'));
      return;
    }

    // 验证文件大小
    if (file.size > 5 * 1024 * 1024) {
      message.error(t('fileTooLarge'));
      return;
    }

    // 创建预览
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);

    // 上传搜索
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(
        `${API_BASE_URL}/visual-search/search?limit=12&minSimilarity=30`,
        {
          method: 'POST',
          body: formData,
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || t('searchFailed', { status: String(response.status) }));
      }

      const data = await response.json();
      setResults(data.results || []);

      if (data.results?.length === 0) {
        message.info(t('noSimilarProducts'));
      }
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : '';
      const errorMsg = errMessage === 'Failed to fetch'
        ? t('networkError')
        : (errMessage || t('searchError'));
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [message, t]);

  /**
   * 用 base64 图片搜索（裁剪后使用）
   */
  const searchWithBase64 = useCallback(async (base64Image: string) => {
    setLoading(true);
    setError(null);
    setResults([]);
    setPreviewUrl(base64Image);

    try {
      // 将 base64 转换为 Blob
      const response = await fetch(base64Image);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append('image', blob, 'cropped-image.jpg');

      const searchResponse = await fetch(
        `${API_BASE_URL}/visual-search/search?limit=12&minSimilarity=30`,
        {
          method: 'POST',
          body: formData,
        },
      );

      if (!searchResponse.ok) {
        const errorData = await searchResponse.json().catch(() => ({}));
        throw new Error(errorData.message || t('searchFailed', { status: String(searchResponse.status) }));
      }

      const data = await searchResponse.json();
      setResults(data.results || []);

      if (data.results?.length === 0) {
        message.info(t('noSimilarProducts'));
      }
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : '';
      const errorMsg = errMessage === 'Failed to fetch'
        ? t('networkError')
        : (errMessage || t('searchError'));
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [message, t]);

  /**
   * 裁剪完成后重新搜索
   */
  const handleCropComplete = useCallback((croppedImage: string) => {
    setShowCropper(false);
    searchWithBase64(croppedImage);
  }, [searchWithBase64]);

  /**
   * 处理粘贴事件
   */
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (loading || previewUrl) return; // 如果正在加载或已有图片，忽略粘贴

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            processImage(file);
          }
          break;
        }
      }
    },
    [loading, previewUrl, processImage],
  );

  /**
   * 监听粘贴事件
   */
  useEffect(() => {
    if (isModalOpen) {
      document.addEventListener('paste', handlePaste);
      return () => {
        document.removeEventListener('paste', handlePaste);
      };
    }
  }, [isModalOpen, handlePaste]);

  /**
   * 处理图片上传（通过拖拽或点击选择）
   */
  const handleUpload = useCallback(
    (file: RcFile) => {
      processImage(file);
      return false; // 阻止自动上传
    },
    [processImage],
  );

  /**
   * 点击商品跳转
   */
  const handleProductClick = (slug: string) => {
    // 设置来源为图搜，用于外跳追踪
    setPageSource(OutboundSource.IMAGE_SEARCH);
    saveReturnScroll(returnTo);
    setIsModalOpen(false);
    router.push(withReturnTo(`/products/${slug}`, returnTo));
  };

  /**
   * 重置搜索状态
   */
  const resetSearch = () => {
    setPreviewUrl(null);
    setResults([]);
    setError(null);
    setShowCropper(false);
  };

  /**
   * 关闭弹窗
   */
  const handleClose = () => {
    setIsModalOpen(false);
    resetSearch();
  };

  /**
   * 查看全部结果 - 跳转到专门的搜索结果页
   */
  const handleViewAll = () => {
    if (previewUrl && results.length > 0) {
      // 存储搜索图片到 sessionStorage
      sessionStorage.setItem('visualSearchImage', previewUrl);
      sessionStorage.setItem('visualSearchResults', JSON.stringify(results));
      setIsModalOpen(false);
      router.push('/search/visual');
    }
  };

  // 预览模式只显示前6个结果 (2行x3列)
  const PREVIEW_LIMIT = 6;
  const previewResults = results.slice(0, PREVIEW_LIMIT);

  const formatProductPrice = (
    min: number,
    max: number,
    sourceCurrency = 'CNY',
  ) => {
    const convertedMin = convertPrice(min, sourceCurrency, displayCurrency, rates);
    const convertedMax = convertPrice(max, sourceCurrency, displayCurrency, rates);
    const isConverted = displayCurrency !== sourceCurrency;
    return `${isConverted ? '≈ ' : ''}${formatPriceRange(convertedMin, convertedMax, displayCurrency)}`;
  };

  /**
   * 渲染触发按钮
   */
  const renderTrigger = () => {
    switch (variant) {
      case 'button':
        return (
          <Button
            variant="secondary"
            icon={<Camera className="w-4 h-4" />}
            onClick={openModal}
            className={className}
          >
            {t('title')}
          </Button>
        );
      case 'text':
        return (
          <Button
            variant="link"
            icon={<Camera className="w-4 h-4" />}
            onClick={openModal}
            className={className}
          >
            {t('title')}
          </Button>
        );
      case 'inline':
        return (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              openModal();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary to-[#FF8F6B] text-white text-sm font-medium hover:brightness-110 transition-all cursor-pointer shrink-0 ${className}`}
            aria-label={t('imageSearch')}
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">{t('imageSearch')}</span>
          </button>
        );
      case 'icon':
      default:
        return (
          <button
            type="button"
            onClick={openModal}
            className={`flex items-center justify-center p-2 text-muted hover:text-foreground transition-colors cursor-pointer ${className}`}
            title={t('title')}
            aria-label={t('title')}
          >
            <Camera className="w-[18px] h-[18px]" />
          </button>
        );
    }
  };

  return (
    <>
      {renderTrigger()}

      <Modal
        title={
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            <span>{t('title')}</span>
          </div>
        }
        open={isModalOpen}
        onCancel={handleClose}
        footer={null}
        width={680}
        destroyOnHidden
      >
        <div className="space-y-4">
          {/* 上传区域 */}
          {!previewUrl && (
            <Upload.Dragger
              accept="image/*"
              showUploadList={false}
              beforeUpload={handleUpload}
              disabled={loading}
            >
              <p className="ant-upload-drag-icon">
                <Inbox className="w-12 h-12 text-primary mx-auto" />
              </p>
              <p className="ant-upload-text">{t('uploadHint')}</p>
              <p className="ant-upload-hint">
                {t('formatHint')}
              </p>
              <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
                <p className="text-gray-400 text-sm flex items-center justify-center gap-1">
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>{t('pasteHint')}</span>
                </p>
              </div>
            </Upload.Dragger>
          )}

          {/* 预览和结果 */}
          {previewUrl && (
            <div className="space-y-4">
              {/* 上传的图片预览 */}
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  { }
                  <img
                    src={previewUrl}
                    alt={t('searchImage')}
                    className="max-h-32 max-w-32 rounded-lg object-cover border"
                  />
                  <button
                    type="button"
                    onClick={resetSearch}
                    aria-label={t('changeImage')}
                    className="absolute -top-2 -right-2 rtl:right-auto rtl:-left-2 w-6 h-6 bg-white rounded-full shadow-md hover:bg-gray-100 flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>

                {loading && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Spinner size="sm" />
                    <span>{t('searching')}</span>
                  </div>
                )}

                {!loading && results.length > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600">
                      {t('resultsCount', { count: results.length })}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Scissors className="w-3.5 h-3.5" />}
                      onClick={() => setShowCropper(true)}
                    >
                      {t('cropAndSearch')}
                    </Button>
                  </div>
                )}
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* 搜索结果预览 */}
              {!loading && results.length > 0 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {previewResults.map((result) => (
                      <div
                        key={result.product.id}
                        className="cursor-pointer group"
                        onClick={() => handleProductClick(result.product.slug)}
                      >
                        <div className="relative aspect-square overflow-hidden rounded-md bg-gray-100">
                          { }
                          <img
                            src={getImageVariant(result.matchedImage || result.product.mainImage || result.product.images?.[0] || '', 300)}
                            alt={result.product.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            referrerPolicy={getImageReferrerPolicy(
                              getImageVariant(result.matchedImage || result.product.mainImage || result.product.images?.[0] || '', 300)
                            )}
                          />
                          {/* 相似度标签 */}
                          <span className="absolute top-1 right-1 rtl:left-1 rtl:right-auto bg-black/70 text-white text-xs px-1 py-0.5 rounded text-[10px]">
                            {result.similarity}%
                          </span>
                        </div>
                        {/* 商品信息 */}
                        <div className="mt-1">
                          <p className="text-xs line-clamp-1 group-hover:text-blue-600 transition-colors">
                            {result.product.title}
                          </p>
                          <p className="text-xs font-semibold text-red-500">
                            {formatProductPrice(
                              result.product.priceMin,
                              result.product.priceMax,
                              result.product.currency || 'CNY',
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 查看全部按钮 */}
                  <div className="text-center pt-2 border-t">
                    <Button
                      variant="primary"
                      onClick={handleViewAll}
                      size="lg"
                      className="w-full"
                    >
                      {t('viewAllResults', { count: results.length })}
                    </Button>
                  </div>
                </div>
              )}

              {/* 无结果 */}
              {!loading && !error && results.length === 0 && previewUrl && (
                <Empty
                  title={t('noResults')}
                  action={
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="primary"
                        icon={<Scissors className="w-4 h-4" />}
                        onClick={() => setShowCropper(true)}
                      >
                        {t('cropAndSearchAgain')}
                      </Button>
                      <Button variant="secondary" onClick={resetSearch}>{t('uploadAnother')}</Button>
                    </div>
                  }
                />
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* 图片裁剪器 */}
      {previewUrl && (
        <ImageCropper
          visible={showCropper}
          imageUrl={previewUrl}
          onCropComplete={handleCropComplete}
          onCancel={() => setShowCropper(false)}
        />
      )}
    </>
  );
}
