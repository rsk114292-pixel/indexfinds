'use client';

import { Card, Button, Tag, Progress, Tooltip, App } from 'antd';
import {
  ScissorOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { post, del } from '@/lib/api';
import type { MixedProduct } from '@/types';
import { getLocalizedName } from '@/lib/utils';
import { getProductCardThumbnail } from '@/lib/image-utils';

interface MixedProductCardProps {
  product: MixedProduct;
  onSplit: () => void;
  onRefresh: () => void;
}

export function MixedProductCard({
  product,
  onSplit,
  onRefresh,
}: MixedProductCardProps) {
  const { message, modal } = App.useApp();

  const mixednessPercent = Math.round((product.mixednessScore || 0) * 100);
  const suggestedGroups = product.splitMetadata?.suggestedGroups || [];
  const confidence = product.splitMetadata?.overallConfidence || 0;

  const getScoreColor = (score: number) => {
    if (score >= 0.7) return '#ff4d4f'; // red
    if (score >= 0.5) return '#faad14'; // orange
    return '#52c41a'; // green
  };

  const handleApproveAsSingle = async () => {
    modal.confirm({
      title: '批准为单一产品',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>这将把该产品标记为单一产品（非混合）。</p>
          <p>该产品将按原样发布，不进行拆分。</p>
        </div>
      ),
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await post(`/products/${product.id}/publish`);
          message.success('产品发布成功');
          onRefresh();
        } catch (error) {
          message.error(
            error instanceof Error ? error.message : '产品发布失败'
          );
        }
      },
    });
  };

  const handleDelete = async () => {
    modal.confirm({
      title: '删除产品',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>确定要删除此产品吗？</p>
          <p className="text-red-500 font-semibold">此操作无法撤销！</p>
          <p className="text-sm text-gray-500 mt-2">
            产品: {product.title}
          </p>
        </div>
      ),
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await del(`/products/${product.id}`);
          message.success('产品删除成功');
          onRefresh();
        } catch (error) {
          message.error(
            error instanceof Error ? error.message : '产品删除失败'
          );
        }
      },
    });
  };

  return (
    <Card
      cover={
        product.mainImage ? (
          <div className="relative">
            { }
            <img
              src={getProductCardThumbnail(product.mainImage)}
              alt={product.title}
              className="h-48 w-full object-cover"
            />
            {/* Mixedness score badge */}
            <div className="absolute top-2 right-2">
              <Tooltip title={`混合度分数: ${mixednessPercent}%`}>
                <Tag color={getScoreColor(product.mixednessScore || 0)}>
                  {mixednessPercent}% 混合
                </Tag>
              </Tooltip>
            </div>
            {/* Image count */}
            {product.images && product.images.length > 1 && (
              <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                {product.images.length} 张图片
              </div>
            )}
          </div>
        ) : (
          <div className="h-48 bg-gray-100 flex items-center justify-center text-gray-400">
            无图片
          </div>
        )
      }
      actions={[
        <Tooltip key="view" title="查看产品详情">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => window.open(`/admin/products/${product.id}`, '_blank')}
          />
        </Tooltip>,
        <Tooltip key="delete" title="删除产品">
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={handleDelete}
          />
        </Tooltip>,
        <Button key="single" size="small" onClick={handleApproveAsSingle}>
          非混合
        </Button>,
        <Button
          key="split"
          type="primary"
          size="small"
          icon={<ScissorOutlined />}
          onClick={onSplit}
        >
          拆分
        </Button>,
      ]}
    >
      <Card.Meta
        title={
          <Tooltip title={product.title}>
            <div className="truncate">{product.title}</div>
          </Tooltip>
        }
        description={
          <div className="space-y-2">
            {/* Original title */}
            {product.originalTitle && (
              <Tooltip title={product.originalTitle}>
                <div className="text-xs text-gray-400 truncate">
                  {product.originalTitle}
                </div>
              </Tooltip>
            )}

            {/* Detected brands/groups */}
            {suggestedGroups.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {suggestedGroups.slice(0, 3).map((group, idx) => (
                  <Tag key={idx} color="blue" className="text-xs">
                    {group.brand}
                  </Tag>
                ))}
                {suggestedGroups.length > 3 && (
                  <Tag className="text-xs">+{suggestedGroups.length - 3}</Tag>
                )}
              </div>
            )}

            {/* Confidence */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500">AI 置信度:</span>
              <Progress
                percent={Math.round(confidence * 100)}
                size="small"
                showInfo={false}
                className="flex-1"
              />
              <span>{Math.round(confidence * 100)}%</span>
            </div>

            {/* Category */}
            {product.primaryCategory && (
              <div className="text-xs text-gray-500">
                {getLocalizedName(product.primaryCategory, 'en')}
              </div>
            )}
          </div>
        }
      />
    </Card>
  );
}
