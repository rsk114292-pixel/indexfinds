'use client';

import { Card, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { ReviewItem } from '@/types';

interface ReviewCardProps {
  item: ReviewItem;
  onApprove: () => void;
  onPublish: () => void;
  onEdit: () => void;
  onRegenerate?: () => void;
}

export function ReviewCard({
  item,
  onApprove,
  onPublish,
  onEdit,
  onRegenerate,
}: ReviewCardProps) {
  const displayData = item.finalData || item.aiGeneratedData || item.sourceData;
  const imageUrl = item.sourceData?.images?.[0];
  const isAiFailed =
    displayData?.title === 'Untitled Product' || !displayData?.title;
  const duplicateOf = item.aiGeneratedData?.duplicateOf;

  return (
    <Card
      cover={
        imageUrl ? (
           
          <img
            src={imageUrl}
            alt={displayData?.title || '产品'}
            className="h-48 object-cover"
          />
        ) : null
      }
      actions={[
        <Button key="edit" onClick={onEdit}>
          编辑
        </Button>,
        ...(onRegenerate
          ? [
              <Button
                key="regenerate"
                icon={<ReloadOutlined />}
                onClick={onRegenerate}
              >
                重跑 AI
              </Button>,
            ]
          : [
              <Button key="approve" onClick={onApprove}>
                批准
              </Button>,
            ]),
        <Button key="publish" type="primary" onClick={onPublish}>
          发布
        </Button>,
      ]}
    >
      {duplicateOf && (
        <div className="mb-2 px-2 py-1 bg-yellow-50 border border-yellow-300 rounded text-yellow-800 text-xs">
          疑似重复产品（相似度 {duplicateOf.similarity}%）：
          <a
            href={`/products/${duplicateOf.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline ml-1"
          >
            {duplicateOf.title}
          </a>
        </div>
      )}
      {isAiFailed && !duplicateOf && (
        <div className="mb-2 px-2 py-1 bg-red-50 border border-red-200 rounded text-red-600 text-xs">
          AI 分析失败，建议重跑 AI
        </div>
      )}
      <Card.Meta
        title={displayData?.title || '未命名'}
        description={
          <div className="text-sm text-gray-500">
            <div>原始标题: {item.sourceData?.title || '-'}</div>
            <div>链接: {item.sourceUrl}</div>
          </div>
        }
      />
    </Card>
  );
}
