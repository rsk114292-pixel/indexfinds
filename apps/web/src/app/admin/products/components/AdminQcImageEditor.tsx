'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Drawer,
  Empty,
  Space,
  Spin,
  Typography,
  Upload,
} from 'antd';
import {
  CopyOutlined,
  InboxOutlined,
  PlusOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { API_BASE_URL, get, patch, request } from '@/lib/api';
import type { Product, ProductQcMedia } from '@/types';

const MAX_QC_IMAGES = 20;
const MAX_UPLOAD_SIZE_MB = 10;

type QcImageUploadFile = UploadFile & {
  sourceUrl?: string;
};

function clampUploadList(list: QcImageUploadFile[], max: number) {
  return list.slice(0, max);
}

function DraggableUploadListItem({
  originNode,
  file,
}: {
  originNode: React.ReactElement;
  file: UploadFile;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: file.uid });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    cursor: 'move',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {originNode}
    </div>
  );
}

interface AdminQcImageEditorProps {
  open: boolean;
  productId: string | null;
  productTitle?: string;
  onClose: () => void;
  onSaved?: () => void;
}

export function AdminQcImageEditor({
  open,
  productId,
  productTitle,
  onClose,
  onSaved,
}: AdminQcImageEditorProps) {
  const { message } = App.useApp();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [qcFileList, setQcFileList] = useState<QcImageUploadFile[]>([]);
  const [lockedMedia, setLockedMedia] = useState<ProductQcMedia[]>([]);

  const enhanceQcFileList = useCallback(
    (list: UploadFile[]): QcImageUploadFile[] =>
      clampUploadList(
        list.map((file) => {
          const response = file.response as { url?: string } | undefined;
          const resolvedUrl = file.url || response?.url;

          return {
            ...file,
            url: resolvedUrl,
            thumbUrl: file.thumbUrl || resolvedUrl,
            sourceUrl: resolvedUrl,
          } as QcImageUploadFile;
        }),
        MAX_QC_IMAGES,
      ),
    [],
  );

  const validateImageFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        message.error('这里只支持上传 QC 图片');
        return Upload.LIST_IGNORE;
      }

      if (file.size / 1024 / 1024 > MAX_UPLOAD_SIZE_MB) {
        message.error(`图片大小不能超过 ${MAX_UPLOAD_SIZE_MB}MB`);
        return Upload.LIST_IGNORE;
      }

      return true;
    },
    [message],
  );

  const uploadFilesToUrls = useCallback(async (files: File[]) => {
    const uploaded = await Promise.all(
      files.map(async (file, index) => {
        const formData = new FormData();
        formData.append('file', file);
        const data = await request<{ url: string }>(`${API_BASE_URL}/upload/image`, {
          method: 'POST',
          body: formData,
        });

        return {
          uid: `hot-qc-paste-${Date.now()}-${index}-${file.name}`,
          name: file.name,
          status: 'done',
          url: data.url,
          thumbUrl: data.url,
          sourceUrl: data.url,
        } as QcImageUploadFile;
      }),
    );

    return uploaded;
  }, []);

  const handlePasteUpload = useCallback(
    async (files: File[]) => {
      const remainingSlots = MAX_QC_IMAGES - qcFileList.length;
      if (remainingSlots <= 0) {
        message.warning(`QC 图片最多只能上传 ${MAX_QC_IMAGES} 张`);
        return;
      }

      const validFiles = files.filter((file) => validateImageFile(file) === true);
      if (validFiles.length === 0) return;

      const filesToUpload = validFiles.slice(0, remainingSlots);
      if (filesToUpload.length < validFiles.length) {
        message.warning(`超出上限，已保留前 ${filesToUpload.length} 张`);
      }

      try {
        const uploadedFiles = await uploadFilesToUrls(filesToUpload);
        setQcFileList((prev) => enhanceQcFileList([...prev, ...uploadedFiles]));
        message.success(`已追加 ${uploadedFiles.length} 张 QC 图`);
      } catch (error) {
        message.error(error instanceof Error ? error.message : '粘贴上传失败');
      }
    },
    [enhanceQcFileList, message, qcFileList.length, uploadFilesToUrls, validateImageFile],
  );

  const handlePaste = useCallback(
    async (event: React.ClipboardEvent<HTMLDivElement>) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      const files = Array.from(items)
        .filter((item) => item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter((file): file is File => Boolean(file));

      if (files.length === 0) return;

      event.preventDefault();
      await handlePasteUpload(files);
    },
    [handlePasteUpload],
  );

  const handleQcUpload: NonNullable<UploadProps['customRequest']> = useCallback(
    async (options) => {
      const { file, onSuccess, onError } = options;

      try {
        const formData = new FormData();
        formData.append('file', file as File);
        const data = await request<{ url: string }>(`${API_BASE_URL}/upload/image`, {
          method: 'POST',
          body: formData,
        });
        onSuccess?.(data);
      } catch (error) {
        onError?.(error as Error);
      }
    },
    [],
  );

  const fetchProduct = useCallback(async () => {
    if (!open || !productId) return;

    setLoading(true);
    try {
      const product = await get<Product>(`/products/${productId}`);
      const qcMedia = [...(product.qcMedia || product.qcPhotos || [])].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      );

      const imageMedia = qcMedia.filter((media) => media.type !== 'video');
      const nonImageMedia = qcMedia.filter((media) => media.type === 'video');

      setLockedMedia(nonImageMedia);
      setQcFileList(
        enhanceQcFileList(
          imageMedia.map((media, index) => ({
            uid: `hot-qc-${media.id || index}`,
            name: `qc-photo-${index + 1}`,
            status: 'done',
            url: media.url,
            thumbUrl: media.url,
            sourceUrl: media.url,
          })),
        ),
      );
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载 QC 图片失败');
    } finally {
      setLoading(false);
    }
  }, [enhanceQcFileList, message, open, productId]);

  useEffect(() => {
    if (open) {
      fetchProduct();
      return;
    }

    setQcFileList([]);
    setLockedMedia([]);
  }, [fetchProduct, open]);

  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      setQcFileList((prev) => {
        const activeIndex = prev.findIndex((item) => item.uid === active.id);
        const overIndex = prev.findIndex((item) => item.uid === over.id);
        return arrayMove(prev, activeIndex, overIndex);
      });
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!productId) return;

    setSaving(true);
    try {
      const imageMedia = qcFileList
        .filter((file) => file.status === 'done')
        .map((file) => file.url || ((file.response as { url?: string } | undefined)?.url))
        .filter((url): url is string => Boolean(url))
        .map((url) => ({
          type: 'image' as const,
          url,
        }));

      const qcMedia = [...imageMedia, ...lockedMedia].map((media, index) => ({
        ...media,
        sortOrder: index,
      }));

      await patch(`/products/${productId}`, { qcMedia });
      message.success('QC 图片已保存');
      onSaved?.();
      onClose();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存 QC 图片失败');
    } finally {
      setSaving(false);
    }
  }, [lockedMedia, message, onClose, onSaved, productId, qcFileList]);

  const imageCountText = useMemo(
    () => `${qcFileList.length} / ${MAX_QC_IMAGES} 张`,
    [qcFileList.length],
  );

  return (
    <Drawer
      title="上传 QC 图片"
      open={open}
      onClose={onClose}
      width={720}
      destroyOnHidden
      extra={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSave}
          >
            保存 QC
          </Button>
        </Space>
      }
    >
      <div className="mb-4">
        <Typography.Title level={5} style={{ marginBottom: 4 }}>
          {productTitle || '当前商品'}
        </Typography.Title>
        <Typography.Text type="secondary">
          这里只维护热门商品的 QC 图片，不改主图、价格和其它商品信息。
        </Typography.Text>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spin size="large" />
        </div>
      ) : (
        <>
          {lockedMedia.length > 0 && (
            <Alert
              type="info"
              showIcon
              className="mb-4"
              message={`检测到 ${lockedMedia.length} 个非图片 QC 媒体`}
              description="这个入口只编辑 QC 图片，已有视频会自动保留，不会被删除。"
            />
          )}

          <div
            role="button"
            tabIndex={0}
            onClick={(event) => event.currentTarget.focus()}
            onPaste={handlePaste}
            className="mb-4 rounded-xl border border-dashed border-blue-200 bg-blue-50/70 px-4 py-3 outline-none transition-colors focus:border-blue-400 focus:bg-blue-50"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CopyOutlined className="text-blue-500" />
                <div>
                  <div className="text-sm font-medium text-gray-800">粘贴上传 QC 图片</div>
                  <div className="text-xs text-gray-500">
                    点击这里后可直接 Ctrl/Cmd + V 粘贴剪贴板图片，快速补热门商品 QC
                  </div>
                </div>
              </div>
              <Button size="small">准备粘贴</Button>
            </div>
          </div>

          <Upload.Dragger
            multiple
            showUploadList={false}
            customRequest={handleQcUpload}
            accept="image/*"
            fileList={qcFileList}
            onChange={({ fileList }) => setQcFileList(enhanceQcFileList(fileList))}
            beforeUpload={(file) => validateImageFile(file as File)}
            className="mb-4"
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽到这里，一次上传多张 QC 图</p>
            <p className="ant-upload-hint">
              当前 {imageCountText}，支持继续追加、删除和拖拽排序
            </p>
          </Upload.Dragger>

          {qcFileList.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="当前没有 QC 图片，拖拽上传或直接粘贴图片即可"
              />
            </div>
          ) : (
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <SortableContext
                items={qcFileList.map((file) => file.uid)}
                strategy={horizontalListSortingStrategy}
              >
                <Upload
                  listType="picture-card"
                  multiple
                  fileList={qcFileList}
                  onChange={({ fileList }) => setQcFileList(enhanceQcFileList(fileList))}
                  onRemove={(file) => {
                    setQcFileList((prev) => prev.filter((item) => item.uid !== file.uid));
                    return false;
                  }}
                  customRequest={handleQcUpload}
                  accept="image/*"
                  beforeUpload={(file) => validateImageFile(file as File)}
                  itemRender={(originNode, file) => (
                    <DraggableUploadListItem originNode={originNode} file={file} />
                  )}
                >
                  {qcFileList.length < MAX_QC_IMAGES && (
                    <div>
                      <PlusOutlined />
                      <div className="mt-2">继续添加</div>
                    </div>
                  )}
                </Upload>
              </SortableContext>
            </DndContext>
          )}

          <p className="mt-3 text-xs text-gray-400">
            保存时仅回写 QC 媒体字段。拖拽顺序会同步到商品详情页的 QC 展示顺序。
          </p>
        </>
      )}
    </Drawer>
  );
}
