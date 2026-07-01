'use client';

import { useCallback, useMemo, useState } from 'react';
import { App, Button, Input, InputNumber, Modal, Upload } from 'antd';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { UploadOutlined } from '@ant-design/icons';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useLgUp } from '@/hooks/useLgUp';
import { MobileSheet } from '@/components/mobile/ui/MobileSheet';
import { request, post } from '@/lib/api';
import { useAuthStore } from '@/stores/useAuthStore';

const MAX_IMAGES = 4;
const MAX_IMAGE_SIZE_MB = 5;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function toHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return null;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

interface SearchProductRequestPromptProps {
  query: string;
  locale: string;
  searchLogId?: string;
  filtersSnapshot?: Record<string, string>;
  redirectPath: string;
}

export function SearchProductRequestPrompt({
  query,
  locale,
  searchLogId,
  filtersSnapshot,
  redirectPath,
}: SearchProductRequestPromptProps) {
  const t = useTranslations('search.requestProduct');
  const { message } = App.useApp();
  const router = useRouter();
  const lgUp = useLgUp();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [productName, setProductName] = useState(query);
  const [description, setDescription] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [budgetMin, setBudgetMin] = useState<number | null>(null);
  const [budgetMax, setBudgetMax] = useState<number | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const resetForm = useCallback(() => {
    setProductName(query);
    setDescription('');
    setReferenceUrl('');
    setBudgetMin(null);
    setBudgetMax(null);
    setFileList([]);
  }, [query]);

  const uploadedImageUrls = useMemo(
    () =>
      fileList
        .map((file) => {
          const response = file.response as { url?: string } | undefined;
          return toHttpUrl(response?.url) || toHttpUrl(file.url);
        })
        .filter((value): value is string => Boolean(value)),
    [fileList],
  );

  const handleOpen = useCallback(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      message.info(t('loginFirst'));
      router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }
    setOpen(true);
  }, [_hasHydrated, isAuthenticated, message, redirectPath, router, t]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const beforeUpload = useCallback<NonNullable<UploadProps['beforeUpload']>>(
    (file) => {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        message.error(t('imageTypeError'));
        return Upload.LIST_IGNORE;
      }
      if (file.size / 1024 / 1024 > MAX_IMAGE_SIZE_MB) {
        message.error(t('imageSizeError', { size: MAX_IMAGE_SIZE_MB }));
        return Upload.LIST_IGNORE;
      }
      return true;
    },
    [message, t],
  );

  const customUpload = useCallback<NonNullable<UploadProps['customRequest']>>(
    async (options) => {
      const { file, onSuccess, onError } = options;
      if (!(file instanceof File)) {
        onError?.(new Error('Invalid file'));
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      setUploading(true);

      try {
        const data = await request<{ url: string }>('/upload/image', {
          method: 'POST',
          body: formData,
        });
        onSuccess?.(data);
      } catch (error) {
        message.error(t('imageUploadFailed'));
        onError?.(error as Error);
      } finally {
        setUploading(false);
      }
    },
    [message, t],
  );

  const handleSubmit = useCallback(async () => {
    const trimmedProductName = productName.trim();
    const trimmedDescription = description.trim();
    const trimmedReferenceUrl = referenceUrl.trim();

    if (!trimmedProductName) {
      message.warning(t('productNameRequired'));
      return;
    }

    if (!trimmedDescription && uploadedImageUrls.length === 0) {
      message.warning(t('requireContent'));
      return;
    }

    if (trimmedReferenceUrl && !isValidHttpUrl(trimmedReferenceUrl)) {
      message.warning(t('referenceUrlInvalid'));
      return;
    }

    if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) {
      message.warning(t('budgetRangeInvalid'));
      return;
    }

    setSubmitting(true);
    try {
      await post('/product-sourcing-requests', {
        searchQuery: query,
        productName: trimmedProductName,
        description: trimmedDescription || undefined,
        referenceUrl: trimmedReferenceUrl || undefined,
        imageUrls: uploadedImageUrls,
        budgetMin: budgetMin ?? undefined,
        budgetMax: budgetMax ?? undefined,
        locale,
        searchLogId,
        filtersSnapshot,
      });

      message.success(t('success'));
      setOpen(false);
      resetForm();
    } catch {
      message.error(t('submitFailed'));
    } finally {
      setSubmitting(false);
    }
  }, [
    budgetMax,
    budgetMin,
    filtersSnapshot,
    locale,
    message,
    productName,
    query,
    referenceUrl,
    resetForm,
    searchLogId,
    t,
    uploadedImageUrls,
    description,
  ]);

  const content = (
    <div className="space-y-4 text-left rtl:text-right">
      <p className="text-sm text-gray-500">{t('sheetDesc')}</p>

      <div>
        <div className="mb-2 text-sm font-medium">{t('productName')}</div>
        <Input
          placeholder={t('productNamePlaceholder')}
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
        />
      </div>

      <div>
        <div className="mb-2 text-sm font-medium">{t('descriptionLabel')}</div>
        <Input.TextArea
          rows={4}
          placeholder={t('descriptionPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <div className="mb-2 text-sm font-medium">{t('referenceUrlLabel')}</div>
        <Input
          placeholder={t('referenceUrlPlaceholder')}
          value={referenceUrl}
          onChange={(e) => setReferenceUrl(e.target.value)}
        />
      </div>

      <div>
        <div className="mb-2 text-sm font-medium">{t('budgetLabel')}</div>
        <div className="flex gap-3 rtl:flex-row-reverse">
          <InputNumber
            min={0}
            className="!w-full"
            placeholder={t('budgetMinPlaceholder')}
            value={budgetMin ?? undefined}
            onChange={(value) => setBudgetMin(value ?? null)}
          />
          <InputNumber
            min={0}
            className="!w-full"
            placeholder={t('budgetMaxPlaceholder')}
            value={budgetMax ?? undefined}
            onChange={(value) => setBudgetMax(value ?? null)}
          />
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium">{t('imagesLabel')}</div>
        <Upload
          listType="picture-card"
          fileList={fileList}
          beforeUpload={beforeUpload}
          customRequest={customUpload}
          onChange={({ fileList: nextFileList }) =>
            setFileList(nextFileList.slice(0, MAX_IMAGES))
          }
          onRemove={(file) => {
            setFileList((prev) => prev.filter((item) => item.uid !== file.uid));
          }}
        >
          {fileList.length >= MAX_IMAGES ? null : (
            <div>
              <UploadOutlined />
              <div className="mt-2 text-xs">{t('uploadButton')}</div>
            </div>
          )}
        </Upload>
        <p className="text-xs text-gray-500">{t('imagesHint')}</p>
      </div>

      <div className="flex justify-end gap-3 rtl:flex-row-reverse">
        {lgUp && (
          <Button onClick={handleClose}>
            {t('cancel')}
          </Button>
        )}
        <Button
          type="primary"
          loading={submitting || uploading}
          onClick={handleSubmit}
        >
          {t('submit')}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <div className="mb-4 rounded-2xl border border-orange-200 bg-orange-50/80 p-4 text-left rtl:text-right">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rtl:md:flex-row-reverse">
          <div className="flex items-start gap-3 rtl:flex-row-reverse">
            <div className="rounded-xl bg-white p-2 text-orange-500 shadow-sm">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">{t('title')}</h3>
              <p className="mt-1 text-sm text-gray-600">{t('description')}</p>
            </div>
          </div>
          <Button type="primary" onClick={handleOpen}>
            {t('button')}
          </Button>
        </div>
      </div>

      {lgUp ? (
        <Modal
          open={open}
          onCancel={handleClose}
          title={t('modalTitle')}
          footer={null}
          width={640}
          destroyOnHidden
        >
          {content}
        </Modal>
      ) : (
        <MobileSheet open={open} onClose={handleClose} title={t('modalTitle')} maxHeight="88vh">
          {content}
        </MobileSheet>
      )}
    </>
  );
}
