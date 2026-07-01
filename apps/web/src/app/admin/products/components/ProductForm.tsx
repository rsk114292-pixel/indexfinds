'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  App,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Card,
  Row,
  Col,
  TreeSelect,
  Upload,
  Spin,
  Space,
  Checkbox,
} from 'antd';
import {
  PlusOutlined,
  LinkOutlined,
  PictureOutlined,
  InboxOutlined,
  DeleteOutlined,
  CopyOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Image from 'next/image';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import { get, request, API_BASE_URL } from '@/lib/api';
import { getProductListThumbnail } from '@/lib/image-utils';
import type { ProductFormData, Category, BrandSimple } from '@/types';

const clampUploadList = (list: UploadFile[], max: number) => list.slice(0, max);
const MAX_PRODUCT_IMAGES = 10;
const MAX_QC_MEDIA = 20;
const MAX_UPLOAD_SIZE_MB = 10;
const MAX_VIDEO_UPLOAD_SIZE_MB = 50;
const VIDEO_THUMB_PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'><rect width='240' height='240' rx='28' fill='%23eef2f7'/><circle cx='120' cy='120' r='42' fill='white' fill-opacity='0.96'/><path d='M109 98l35 22-35 22z' fill='%231f2937'/></svg>";

type QcMediaType = 'image' | 'video';

type QcMediaUploadFile = UploadFile & {
  qcMediaType?: QcMediaType;
  posterUrl?: string | null;
  mimeType?: string | null;
  duration?: number | null;
};

interface UploadResponsePayload {
  url: string;
  mimetype?: string;
  type?: QcMediaType;
  posterUrl?: string | null;
  duration?: number | null;
}

function DraggableUploadListItem({
  originNode,
  file,
  selectable = false,
  selected = false,
  onToggleSelect,
}: {
  originNode: React.ReactElement;
  file: UploadFile;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (uid: string, checked: boolean) => void;
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
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="relative">
      {originNode}
      {selectable && (
        <div
          className="absolute left-2 top-2 z-10 rounded-md bg-white/90 p-1 shadow-sm"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onChange={(event) => onToggleSelect?.(file.uid, event.target.checked)}
            aria-label={`选择 ${file.name}`}
          />
        </div>
      )}
    </div>
  );
}

interface ProductFormProps {
  initialData?: ProductFormData & { id?: string; detailImages?: string[]; brand?: BrandSimple | null };
  onSubmit: (data: ProductFormData) => Promise<void>;
  loading?: boolean;
}

export function ProductForm({ initialData, onSubmit, loading }: ProductFormProps) {
  const [form] = Form.useForm();
  const { token } = useAdminAuthReady();
  const { message } = App.useApp();
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<BrandSimple[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [qcFileList, setQcFileList] = useState<QcMediaUploadFile[]>([]);
  const [selectedQcUids, setSelectedQcUids] = useState<string[]>([]);
  const [qcPasteUploading, setQcPasteUploading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
  );
  const initialBrandId = initialData?.brandId;
  const initialBrandName = initialData?.brand?.name;
  const currentStatus = Form.useWatch('status', form) || initialData?.status || 'draft';
  const allowParentCategories =
    currentStatus === 'draft' || currentStatus === 'pending_review';
  const uploadHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;

  const enhanceQcFileList = useCallback(
    (list: UploadFile[]): QcMediaUploadFile[] =>
      clampUploadList(
        list.map((file) => {
          const response = file.response as UploadResponsePayload | undefined;
          const qcMediaType: QcMediaType =
            response?.type === 'video' || file.type?.startsWith('video/')
              ? 'video'
              : 'image';
          const posterUrl =
            response?.posterUrl ??
            ((file as QcMediaUploadFile).posterUrl ?? null);

          return {
            ...file,
            url: file.url || response?.url,
            thumbUrl:
              file.thumbUrl ||
              (qcMediaType === 'video'
                ? posterUrl || VIDEO_THUMB_PLACEHOLDER
                : undefined),
            qcMediaType,
            posterUrl,
            mimeType:
              response?.mimetype ||
              (file as QcMediaUploadFile).mimeType ||
              file.type ||
              null,
            duration:
              response?.duration ??
              ((file as QcMediaUploadFile).duration ?? null),
          };
        }),
        MAX_QC_MEDIA,
      ) as QcMediaUploadFile[],
    [],
  );

  const toggleQcSelection = useCallback((uid: string, checked: boolean) => {
    setSelectedQcUids((prev) =>
      checked ? [...new Set([...prev, uid])] : prev.filter((item) => item !== uid),
    );
  }, []);

  const clearQcSelection = useCallback(() => {
    setSelectedQcUids([]);
  }, []);

  const handleBatchDeleteQc = useCallback(() => {
    if (selectedQcUids.length === 0) return;

    setQcFileList((prev) => prev.filter((file) => !selectedQcUids.includes(file.uid)));
    setSelectedQcUids([]);
    message.success(`已删除 ${selectedQcUids.length} 项 QC 媒体`);
  }, [message, selectedQcUids]);

  const validateImageFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        message.error('只能上传图片文件');
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

  const uploadFilesToUrls = useCallback(
    async (files: File[]) => {
      const uploaded = await Promise.all(
        files.map(async (file, index) => {
          const formData = new FormData();
          formData.append('file', file);
          const data = await request<{ url: string }>(`${API_BASE_URL}/upload/image`, {
            method: 'POST',
            body: formData,
          });

          return {
            uid: `qc-paste-${Date.now()}-${index}-${file.name}`,
            name: file.name,
            status: 'done',
            url: data.url,
            qcMediaType: 'image',
            mimeType: file.type,
          } as QcMediaUploadFile;
        }),
      );

      return uploaded;
    },
    [],
  );

  const handleQcPasteUpload = useCallback(
    async (files: File[]) => {
      const remainingSlots = MAX_QC_MEDIA - qcFileList.length;
      if (remainingSlots <= 0) {
        message.warning(`QC 媒体最多只能上传 ${MAX_QC_MEDIA} 项`);
        return;
      }

      const validFiles = files.filter(validateImageFile);
      if (validFiles.length === 0) return;

      const filesToUpload = validFiles.slice(0, remainingSlots);
      if (filesToUpload.length < validFiles.length) {
        message.warning(`超出上限，已保留前 ${filesToUpload.length} 张`);
      }

      try {
        setQcPasteUploading(true);
        const uploadedFiles = await uploadFilesToUrls(filesToUpload);
        setQcFileList((prev) =>
          enhanceQcFileList([...prev, ...uploadedFiles]),
        );
        message.success(`已追加 ${uploadedFiles.length} 张 QC 图`);
      } catch (error) {
        message.error(error instanceof Error ? error.message : '粘贴上传失败');
      } finally {
        setQcPasteUploading(false);
      }
    },
    [enhanceQcFileList, message, qcFileList.length, uploadFilesToUrls, validateImageFile],
  );

  const handleQcPaste = useCallback(
    async (event: React.ClipboardEvent<HTMLDivElement>) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      const files = Array.from(items)
        .filter((item) => item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter((file): file is File => Boolean(file));

      if (files.length === 0) return;

      event.preventDefault();
      await handleQcPasteUpload(files);
    },
    [handleQcPasteUpload],
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      setFileList((prev) => {
        const activeIndex = prev.findIndex((i) => i.uid === active.id);
        const overIndex = prev.findIndex((i) => i.uid === over.id);
        return arrayMove(prev, activeIndex, overIndex);
      });
    }
  };

  const onQcDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      setQcFileList((prev) => {
        const activeIndex = prev.findIndex((i) => i.uid === active.id);
        const overIndex = prev.findIndex((i) => i.uid === over.id);
        return arrayMove(prev, activeIndex, overIndex);
      });
    }
  };

  const validateQcMediaFile = useCallback(
    (file: File) => {
      if (file.type.startsWith('image/')) {
        return validateImageFile(file);
      }

      const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
      if (!allowedVideoTypes.includes(file.type)) {
        message.error('QC 媒体仅支持图片、MP4、WebM 或 MOV 视频');
        return Upload.LIST_IGNORE;
      }

      if (file.size / 1024 / 1024 > MAX_VIDEO_UPLOAD_SIZE_MB) {
        message.error(`视频大小不能超过 ${MAX_VIDEO_UPLOAD_SIZE_MB}MB`);
        return Upload.LIST_IGNORE;
      }

      return true;
    },
    [message, validateImageFile],
  );

  const uploadQcMediaFile = useCallback(async (file: File) => {
    const endpoint = file.type.startsWith('video/')
      ? `${API_BASE_URL}/upload/video`
      : `${API_BASE_URL}/upload/image`;
    const formData = new FormData();
    formData.append('file', file);

    const data = await request<UploadResponsePayload>(endpoint, {
      method: 'POST',
      body: formData,
    });

    return data;
  }, []);

  const handleQcMediaUpload: NonNullable<UploadProps['customRequest']> = useCallback(
    async (options) => {
      const { file, onSuccess, onError } = options;
      const uploadFile = file as File;

      try {
        const data = await uploadQcMediaFile(uploadFile);
        onSuccess?.(data);
      } catch (error) {
        onError?.(error as Error);
      }
    },
    [uploadQcMediaFile],
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesData, brandsRes] = await Promise.all([
          get<Category[]>('/categories', { includeLegacy: false }),
          get<{ data: BrandSimple[] }>('/brands', { limit: 0, status: 'active' }),
        ]);
        setCategories(categoriesData || []);
        // 确保当前产品的品牌在下拉列表中（品牌 API 有 1 小时缓存，新品牌可能不在列表里）
        const brandList = brandsRes?.data || [];
        if (
          initialBrandId &&
          initialBrandName &&
          !brandList.some((b) => b.id === initialBrandId)
        ) {
          brandList.push({
            id: initialBrandId,
            name: initialBrandName,
          } as BrandSimple);
        }
        setBrands(brandList);
      } catch {
        // 加载失败时静默处理
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [initialBrandId, initialBrandName]);

  useEffect(() => {
    if (initialData) {
      form.setFieldsValue(initialData);
      if (initialData.images) {
        setFileList(
          initialData.images.map((url, index) => ({
            uid: `-${index}`,
            name: `image-${index}`,
            status: 'done',
            url,
          }))
        );
      }
      const existingQcMedia = initialData.qcMedia || initialData.qcPhotos;
      if (existingQcMedia) {
        setQcFileList(
          enhanceQcFileList(
            [...existingQcMedia]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((media, index) => ({
              uid: `qc-${media.id || index}`,
              name:
                media.type === 'video'
                  ? `qc-video-${index}`
                  : `qc-photo-${index}`,
              status: 'done',
              url: media.url,
              thumbUrl:
                media.type === 'video'
                  ? media.posterUrl || VIDEO_THUMB_PLACEHOLDER
                  : media.url,
              qcMediaType: media.type === 'video' ? 'video' : 'image',
              posterUrl: media.posterUrl ?? null,
              mimeType: media.mimeType ?? null,
              duration: media.duration ?? null,
            })),
          )
        );
      }
    }
  }, [enhanceQcFileList, initialData, form]);

  useEffect(() => {
    setSelectedQcUids((prev) => prev.filter((uid) => qcFileList.some((file) => file.uid === uid)));
  }, [qcFileList]);

  const handleFinish = async (values: ProductFormData) => {
    const images = fileList
      .filter((f) => f.status === 'done')
      .map((f) => f.url || f.response?.url)
      .filter(Boolean);

    const qcMedia = qcFileList
      .filter((f) => f.status === 'done')
      .map((f, index) => ({
        url: f.url || f.response?.url,
        type: f.qcMediaType === 'video' ? 'video' : 'image',
        posterUrl: f.posterUrl ?? null,
        mimeType:
          (f.response as UploadResponsePayload | undefined)?.mimetype ||
          f.mimeType ||
          f.type ||
          null,
        duration:
          (f.response as UploadResponsePayload | undefined)?.duration ??
          f.duration ??
          null,
        sortOrder: index,
      }))
      .filter(
        (
          media,
        ): media is {
          url: string;
          type: QcMediaType;
          posterUrl: string | null;
          mimeType: string | null;
          duration: number | null;
          sortOrder: number;
        } => Boolean(media.url),
      );

    await onSubmit({ ...values, images, qcMedia });
  };

  interface TreeNode {
    value: string;
    title: string;
    disabled?: boolean;
    selectable?: boolean;
    children?: TreeNode[];
  }
  const transformCategories = (cats: Category[]): TreeNode[] => {
    return cats.map((cat) => ({
      value: cat.id,
      title: cat.name,
      disabled: Boolean(cat.children?.length) && !allowParentCategories,
      selectable: allowParentCategories || !cat.children?.length,
      children: cat.children ? transformCategories(cat.children) : undefined,
    }));
  };

  if (dataLoading) {
    return (
      <>
        <div className="flex justify-center py-12">
          <Spin size="large" />
        </div>
        <Form form={form} style={{ display: 'none' }} />
      </>
    );
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{
        status: 'draft',
        priceMin: 0,
        priceMax: 0,
      }}
    >
      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Card title="基本信息" className="mb-4">
            {initialData?.slug && (
              <Form.Item name="slug" label="Slug（URL）">
                <Input readOnly disabled style={{ backgroundColor: '#f5f5f5' }} />
              </Form.Item>
            )}

            <Form.Item
              name="title"
              label="标题（英文）"
              rules={[{ required: true, message: '请输入标题' }]}
            >
              <Input placeholder="英文产品标题" />
            </Form.Item>

            {(initialData?.weidianItemId || initialData?.splitSourceWeidianId) && (
              <Form.Item label="微店商品 ID">
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    value={initialData.weidianItemId || initialData.splitSourceWeidianId}
                    readOnly
                    style={{ backgroundColor: '#f5f5f5' }}
                  />
                  <Button
                    type="primary"
                    icon={<LinkOutlined />}
                    onClick={() =>
                      window.open(
                        `https://weidian.com/item.html?itemId=${initialData.weidianItemId || initialData.splitSourceWeidianId}`,
                        '_blank'
                      )
                    }
                  >
                    在微店查看
                  </Button>
                </Space.Compact>
              </Form.Item>
            )}

            <Form.Item name="description" label="描述">
              <Input.TextArea rows={4} placeholder="产品描述" />
            </Form.Item>
          </Card>

          <Card title="图片" className="mb-4">
            <Upload.Dragger
              multiple
              showUploadList={false}
              action={`${API_BASE_URL}/upload/image`}
              headers={uploadHeaders}
              accept="image/*"
              fileList={fileList}
              onChange={({ fileList }) => setFileList(clampUploadList(fileList, MAX_PRODUCT_IMAGES))}
              beforeUpload={(file) => validateImageFile(file as File)}
              className="mb-4"
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽到这里，一次上传多张主图</p>
              <p className="ant-upload-hint">
                支持批量追加上传，上传后可继续拖拽排序。当前 {fileList.length} / 10 张
              </p>
            </Upload.Dragger>

            <DndContext sensors={sensors} onDragEnd={onDragEnd}>
              <SortableContext
                items={fileList.map((f) => f.uid)}
                strategy={horizontalListSortingStrategy}
              >
                <Upload
                  listType="picture-card"
                  multiple
                  fileList={fileList}
                  onChange={({ fileList }) => setFileList(clampUploadList(fileList, MAX_PRODUCT_IMAGES))}
                  action={`${API_BASE_URL}/upload/image`}
                  headers={uploadHeaders}
                  accept="image/*"
                  beforeUpload={(file) => validateImageFile(file as File)}
                  itemRender={(originNode, file) => (
                    <DraggableUploadListItem originNode={originNode} file={file} />
                  )}
                >
                  {fileList.length < MAX_PRODUCT_IMAGES && (
                    <div>
                      <PlusOutlined />
                      <div className="mt-2">继续添加</div>
                    </div>
                  )}
                </Upload>
              </SortableContext>
            </DndContext>
          </Card>

          <Card title="QC Media" className="mb-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-3">
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-800">
                  已选中 {selectedQcUids.length} 项
                </div>
                <div className="text-xs text-gray-500">
                  支持图片和视频混合上传、勾选批量删除，也支持点击下方区域后直接 Ctrl/Cmd + V 粘贴图片
                </div>
              </div>
              <Space>
                <Button size="small" onClick={clearQcSelection} disabled={selectedQcUids.length === 0}>
                  清空选择
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleBatchDeleteQc}
                  disabled={selectedQcUids.length === 0}
                >
                  批量删除
                </Button>
              </Space>
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={(event) => event.currentTarget.focus()}
              onPaste={handleQcPaste}
              className="mb-4 rounded-xl border border-dashed border-blue-200 bg-blue-50/70 px-4 py-3 outline-none transition-colors focus:border-blue-400 focus:bg-blue-50"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CopyOutlined className="text-blue-500" />
                  <div>
                    <div className="text-sm font-medium text-gray-800">粘贴上传 QC 图片</div>
                    <div className="text-xs text-gray-500">
                      点击这里后可直接 Ctrl/Cmd + V 粘贴剪贴板图片，自动追加到当前 QC 媒体列表
                    </div>
                  </div>
                </div>
                <Button size="small" loading={qcPasteUploading}>
                  准备粘贴
                </Button>
              </div>
            </div>

            <Upload.Dragger
              multiple
              showUploadList={false}
              customRequest={handleQcMediaUpload}
              accept="image/*,video/mp4,video/webm,video/quicktime"
              fileList={qcFileList}
              onChange={({ fileList }) => setQcFileList(enhanceQcFileList(fileList))}
              beforeUpload={(file) => validateQcMediaFile(file as File)}
              className="mb-4"
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽到这里，一次上传多项 QC 媒体</p>
              <p className="ant-upload-hint">
                支持图片和视频混合追加、图片粘贴上传和拖拽排序。当前 {qcFileList.length} / {MAX_QC_MEDIA} 项
              </p>
            </Upload.Dragger>

            <DndContext sensors={sensors} onDragEnd={onQcDragEnd}>
              <SortableContext
                items={qcFileList.map((f) => f.uid)}
                strategy={horizontalListSortingStrategy}
              >
                <Upload
                  listType="picture-card"
                  multiple
                  fileList={qcFileList}
                  onChange={({ fileList }) => setQcFileList(enhanceQcFileList(fileList))}
                  customRequest={handleQcMediaUpload}
                  accept="image/*,video/mp4,video/webm,video/quicktime"
                  beforeUpload={(file) => validateQcMediaFile(file as File)}
                  itemRender={(originNode, file) => (
                    <DraggableUploadListItem
                      originNode={
                        <div className="relative">
                          {originNode}
                          {(file as QcMediaUploadFile).qcMediaType === 'video' && (
                            <span className="absolute bottom-2 left-2 z-10 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white">
                              <VideoCameraOutlined className="mr-1" />
                              视频
                            </span>
                          )}
                        </div>
                      }
                      file={file as QcMediaUploadFile}
                      selectable
                      selected={selectedQcUids.includes(file.uid)}
                      onToggleSelect={toggleQcSelection}
                    />
                  )}
                >
                  {qcFileList.length < MAX_QC_MEDIA && (
                    <div>
                      <PlusOutlined />
                      <div className="mt-2">继续添加 QC 媒体</div>
                    </div>
                  )}
                </Upload>
              </SortableContext>
            </DndContext>
            <p className="mt-3 text-xs text-gray-400">
              仅展示当前产品的 QC 媒体。支持图片和视频混合上传、图片粘贴追加、勾选批量删除和拖拽排序，不会混入商品主图。
            </p>
          </Card>

          {initialData?.detailImages && initialData.detailImages.length > 0 && (
            <Card
              title={
                <span>
                  <PictureOutlined className="mr-2" />
                  详情图（{initialData.detailImages.length} 张，来自微店商品描述）
                </span>
              }
              className="mb-4"
            >
              <div className="flex flex-wrap gap-2">
                {initialData.detailImages.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-[104px] h-[104px] border border-gray-200 rounded-lg overflow-hidden hover:border-blue-400 transition-colors"
                  >
                    <Image
                      src={getProductListThumbnail(url)}
                      alt={`详情图 ${index + 1}`}
                      width={104}
                      height={104}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </a>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                详情图来自微店商品描述，仅供查看。客户端产品页会自动合并展示。
              </p>
            </Card>
          )}
        </Col>

        <Col xs={24} lg={8}>
          <Card title="归类" className="mb-4">
            <Form.Item name="brandId" label="品牌名称">
              <Select
                showSearch
                placeholder="选择品牌"
                allowClear
                optionFilterProp="label"
                options={brands.map((b) => ({ value: b.id, label: b.name }))}
              />
            </Form.Item>

            <Form.Item name="primaryCategoryId" label="主要分类">
              <TreeSelect
                showSearch
                placeholder="选择分类"
                allowClear
                treeData={transformCategories(categories)}
                treeDefaultExpandAll
              />
            </Form.Item>
            {allowParentCategories && (
              <div className="mb-4 text-xs text-amber-600">
                审核态可暂时选择父分类保存；正式上架前仍需补成最深层子分类。
              </div>
            )}

            {initialData?.weidianShopName && (
              <Form.Item label="来源店铺">
                <Input
                  value={initialData.weidianShopName}
                  readOnly
                  disabled
                  style={{ backgroundColor: '#f5f5f5' }}
                />
              </Form.Item>
            )}
          </Card>

          <Card title="定价" className="mb-4">
            <Form.Item
              name="priceMin"
              label="最低价（CNY）"
              rules={[{ required: true }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="priceMax"
              label="最高价（CNY）"
              rules={[{ required: true }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Card>

          <Card title="状态" className="mb-4">
            <Form.Item name="status" label="状态" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'draft', label: '草稿' },
                  { value: 'pending_review', label: '待审核' },
                  { value: 'active', label: '已上架' },
                  { value: 'inactive', label: '已下架' },
                ]}
              />
            </Form.Item>
          </Card>

          <Card title="AI 生成属性" className="mb-4">
            <Form.Item name={['aiAttributes', 'colors']} label="颜色">
              <Select
                mode="tags"
                placeholder="添加颜色"
                options={[
                  { value: 'Black', label: '黑色' },
                  { value: 'White', label: '白色' },
                  { value: 'Red', label: '红色' },
                  { value: 'Blue', label: '蓝色' },
                  { value: 'Green', label: '绿色' },
                  { value: 'Yellow', label: '黄色' },
                  { value: 'Pink', label: '粉色' },
                  { value: 'Purple', label: '紫色' },
                  { value: 'Orange', label: '橙色' },
                  { value: 'Brown', label: '棕色' },
                  { value: 'Grey', label: '灰色' },
                  { value: 'Beige', label: '米色' },
                  { value: 'Navy', label: '藏青色' },
                ]}
              />
            </Form.Item>

            <Form.Item name={['aiAttributes', 'styles']} label="风格">
              <Select
                mode="tags"
                placeholder="添加风格"
                options={[
                  { value: 'Casual', label: '休闲' },
                  { value: 'Streetwear', label: '街头' },
                  { value: 'Sporty', label: '运动' },
                  { value: 'Luxury', label: '奢华' },
                  { value: 'Vintage', label: '复古' },
                  { value: 'Minimalist', label: '极简' },
                  { value: 'Classic', label: '经典' },
                  { value: 'Retro', label: '怀旧' },
                  { value: 'Modern', label: '现代' },
                  { value: 'Athletic', label: '运动风' },
                ]}
              />
            </Form.Item>

            <Form.Item name={['aiAttributes', 'occasions']} label="场合">
              <Select
                mode="tags"
                placeholder="添加场合"
                options={[
                  { value: 'Casual', label: '休闲' },
                  { value: 'Everyday', label: '日常' },
                  { value: 'Sports', label: '运动' },
                  { value: 'Formal', label: '正式' },
                  { value: 'Party', label: '派对' },
                  { value: 'Work', label: '工作' },
                  { value: 'Travel', label: '旅行' },
                  { value: 'Outdoor', label: '户外' },
                ]}
              />
            </Form.Item>

            <Form.Item name={['aiAttributes', 'seasons']} label="季节">
              <Select
                mode="tags"
                placeholder="添加季节"
                options={[
                  { value: 'Spring', label: '春季' },
                  { value: 'Summer', label: '夏季' },
                  { value: 'Fall', label: '秋季' },
                  { value: 'Winter', label: '冬季' },
                  { value: 'All Season', label: '四季' },
                ]}
              />
            </Form.Item>

            <Form.Item name={['aiAttributes', 'gender']} label="性别">
              <Select
                placeholder="选择性别"
                allowClear
                options={[
                  { value: 'men', label: '男士' },
                  { value: 'women', label: '女士' },
                  { value: 'unisex', label: '中性' },
                  { value: 'kids', label: '儿童' },
                ]}
              />
            </Form.Item>
          </Card>

          <Button type="primary" htmlType="submit" loading={loading} block>
            {initialData?.id ? '更新产品' : '创建产品'}
          </Button>
        </Col>
      </Row>
    </Form>
  );
}
