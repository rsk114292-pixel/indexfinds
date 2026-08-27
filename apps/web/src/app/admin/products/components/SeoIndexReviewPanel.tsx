'use client';

import { useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Input,
  Space,
  Tag,
  Typography,
} from 'antd';
import { CheckCircleOutlined, StopOutlined } from '@ant-design/icons';
import { post } from '@/lib/api';
import type { Product } from '@/types';

type SeoIndexReviewPanelProps = {
  product: Pick<Product, 'id' | 'status' | 'seoIndexable'>;
  onReviewed: (seoIndexable: boolean) => void;
};

export function SeoIndexReviewPanel({
  product,
  onReviewed,
}: SeoIndexReviewPanelProps) {
  const { message } = App.useApp();
  const [verified, setVerified] = useState(false);
  const [deduplicated, setDeduplicated] = useState(false);
  const [uniqueValue, setUniqueValue] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isActive = product.status === 'active';
  const canApprove = useMemo(
    () =>
      isActive &&
      verified &&
      deduplicated &&
      uniqueValue &&
      reviewNote.trim().length >= 10,
    [deduplicated, isActive, reviewNote, uniqueValue, verified],
  );

  const submitReview = async (indexable: boolean) => {
    setSubmitting(true);
    try {
      await post(`/products/${product.id}/seo-index`, {
        indexable,
        ...(indexable
          ? {
              verified,
              deduplicated,
              uniqueValue,
              reviewNote: reviewNote.trim(),
            }
          : {}),
      });
      onReviewed(indexable);
      message.success(
        indexable
          ? '该商品已通过 Google 收录审核'
          : '该商品已从 Google 收录队列中移除',
      );
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : '更新收录审核状态失败',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card
      className="mt-6"
      title="Google 收录审核"
      extra={
        product.seoIndexable ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            已允许收录
          </Tag>
        ) : (
          <Tag icon={<StopOutlined />}>默认不收录</Tag>
        )
      }
    >
      <Alert
        className="mb-4"
        type="info"
        showIcon
        message="自动采集不等于自动收录"
        description="商品可以在网站内浏览，但只有经过资料验证、重复排除并确认具有独有价值后，才会进入 Sitemap 并允许 Google 收录。"
      />

      {product.seoIndexable ? (
        <Space direction="vertical" size="middle">
          <Typography.Text>
            修改商品内容或将商品下架会自动撤销此资格，并要求重新审核。
          </Typography.Text>
          <Button
            danger
            loading={submitting}
            onClick={() => void submitReview(false)}
          >
            撤销收录资格
          </Button>
        </Space>
      ) : (
        <Space direction="vertical" size="middle" className="w-full">
          {!isActive && (
            <Alert
              type="warning"
              showIcon
              message="只有已上架商品可以申请收录"
            />
          )}
          <Checkbox
            checked={verified}
            onChange={(event) => setVerified(event.target.checked)}
          >
            商品标题、描述、价格、图片、分类和来源已经人工验证
          </Checkbox>
          <Checkbox
            checked={deduplicated}
            onChange={(event) => setDeduplicated(event.target.checked)}
          >
            已检查并排除重复商品或近似重复页面
          </Checkbox>
          <Checkbox
            checked={uniqueValue}
            onChange={(event) => setUniqueValue(event.target.checked)}
          >
            页面提供了不是来源页面简单复制的独有信息或判断价值
          </Checkbox>
          <Input.TextArea
            rows={4}
            maxLength={1000}
            showCount
            value={reviewNote}
            onChange={(event) => setReviewNote(event.target.value)}
            placeholder="填写本页的独有价值、验证依据或去重结论（至少 10 个字符）"
          />
          <Button
            type="primary"
            disabled={!canApprove}
            loading={submitting}
            onClick={() => void submitReview(true)}
          >
            通过审核并允许 Google 收录
          </Button>
        </Space>
      )}
    </Card>
  );
}
