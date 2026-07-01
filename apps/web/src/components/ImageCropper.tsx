'use client';

import { useState, useRef, useCallback } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { Modal } from 'antd';
import { Scissors, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTranslations } from 'next-intl';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropperProps {
  /** 图片 URL (base64 或 http) */
  imageUrl: string;
  /** 裁剪完成回调，返回裁剪后的 base64 图片 */
  onCropComplete: (croppedImageBase64: string) => void;
  /** 取消回调 */
  onCancel: () => void;
  /** 是否显示 */
  visible: boolean;
}

/**
 * 图片裁剪组件
 * 用于以图搜图时裁剪图片区域
 */
export default function ImageCropper({
  imageUrl,
  onCropComplete,
  onCancel,
  visible,
}: ImageCropperProps) {
  const t = useTranslations('visualSearch');
  const tCommon = useTranslations('common');
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  /**
   * 获取裁剪后的图片 base64
   */
  const getCroppedImage = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!imgRef.current || !completedCrop) {
        reject(new Error('No image or crop data'));
        return;
      }

      const image = imgRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('No canvas context'));
        return;
      }

      // 计算实际裁剪尺寸
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      canvas.width = completedCrop.width * scaleX;
      canvas.height = completedCrop.height * scaleY;

      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      // 转换为 base64
      const base64 = canvas.toDataURL('image/jpeg', 0.9);
      resolve(base64);
    });
  }, [completedCrop]);

  /**
   * 确认裁剪
   */
  const handleConfirm = async () => {
    try {
      const croppedImage = await getCroppedImage();
      onCropComplete(croppedImage);
    } catch {
      // 裁剪失败静默处理
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4" />
          <span>{t('cropImage')}</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={
        <div className="flex justify-between">
          <div className="text-gray-500 text-sm">
            {t('cropHint')}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" icon={<X className="w-4 h-4" />} onClick={onCancel}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="primary"
              icon={<Check className="w-4 h-4" />}
              onClick={handleConfirm}
              disabled={!completedCrop}
            >
              {t('confirmCropAndSearch')}
            </Button>
          </div>
        </div>
      }
      width={700}
      destroyOnHidden
    >
      <div className="flex justify-center py-4">
        <ReactCrop
          crop={crop}
          onChange={(c) => setCrop(c)}
          onComplete={(c) => setCompletedCrop(c)}
          aspect={undefined}
          minWidth={50}
          minHeight={50}
        >
          { }
          <img
            ref={imgRef}
            src={imageUrl}
            alt={t('imageToCrop')}
            style={{ maxHeight: '60vh', maxWidth: '100%' }}
            crossOrigin="anonymous"
          />
        </ReactCrop>
      </div>
    </Modal>
  );
}
