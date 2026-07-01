'use client';

import { Card, Button, Tag } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import type { ReviewItem } from '@/types';

interface DuplicateCardProps {
  item: ReviewItem;
  onRegenerate: () => void;
  onSkip: () => void;
}

export function DuplicateCard({ item, onRegenerate, onSkip }: DuplicateCardProps) {
  const duplicateOf = item.aiGeneratedData?.duplicateOf;
  const newImage = item.sourceData?.images?.[0];
  const existingImage = duplicateOf?.mainImage;

  if (!duplicateOf) return null;

  return (
    <Card className="overflow-hidden">
      <div className="flex gap-3 mb-3">
        {/* New product image */}
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-400 mb-1">新导入</div>
          <div className="aspect-square bg-gray-100 rounded overflow-hidden">
            {newImage ? (
               
              <img src={newImage} alt="新产品" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">无图片</div>
            )}
          </div>
          <div className="mt-1 text-xs text-gray-500 truncate">
            {item.sourceData?.title || '未命名'}
          </div>
        </div>

        {/* Similarity indicator */}
        <div className="flex flex-col items-center justify-center px-1">
          <SwapOutlined className="text-orange-400 text-lg" />
          <Tag color="orange" className="mt-1 text-xs">
            {duplicateOf.similarity}%
          </Tag>
        </div>

        {/* Existing product image */}
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-400 mb-1">已有产品</div>
          <div className="aspect-square bg-gray-100 rounded overflow-hidden">
            {existingImage ? (
               
              <img src={existingImage} alt="已有产品" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">无图片</div>
            )}
          </div>
          <div className="mt-1 text-xs truncate">
            <a
              href={`/admin/products/${duplicateOf.productId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              {duplicateOf.title}
            </a>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-400 mb-3">
        来源: {item.sourceUrl}
      </div>

      <div className="flex gap-2">
        <Button block onClick={onRegenerate}>
          不是重复，继续 AI 分析
        </Button>
        <Button block danger onClick={onSkip}>
          确认重复，跳过
        </Button>
      </div>
    </Card>
  );
}
