'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Image,
  Space,
  Tag,
  Typography,
} from 'antd';
import { fetcher } from '@/lib/api';
import type {
  BrandCandidate,
  BrandCandidateDetail,
  BrandCandidateSampleProduct,
  Product,
} from '@/types';

interface BrandCandidateReviewDrawerProps {
  open: boolean;
  loading: boolean;
  candidate: BrandCandidate | null;
  detail?: BrandCandidateDetail;
  onClose: () => void;
  onBind: (candidate: BrandCandidate) => void;
  onCreateChild: (candidate: BrandCandidate) => void;
  onCreateCanonical: (candidate: BrandCandidate) => void;
  onResolve: (
    candidate: BrandCandidate,
    action: 'classify_unknown' | 'classify_inspired' | 'classify_invalid',
  ) => void;
}

const productStatusColors: Record<string, string> = {
  active: 'green',
  draft: 'default',
  pending_review: 'gold',
  inactive: 'red',
  archived: 'default',
};

function isDesignFallbackBrand(product: BrandCandidateSampleProduct) {
  return product.brand?.slug === 'design';
}

function hasEvidence(
  candidate: BrandCandidate | BrandCandidateDetail,
): candidate is BrandCandidateDetail {
  return Array.isArray((candidate as BrandCandidateDetail).sampleProducts);
}

function formatConfidence(value?: number | null) {
  if (typeof value !== 'number') return '-';
  return `${Math.round(value * 100)}%`;
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function formatPrice(product: BrandCandidateSampleProduct) {
  if (typeof product.priceMin !== 'number' && typeof product.priceMax !== 'number') {
    return '-';
  }

  const currency = product.currency || 'CNY';
  const formatter = new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });

  if (
    typeof product.priceMin === 'number' &&
    typeof product.priceMax === 'number' &&
    product.priceMin !== product.priceMax
  ) {
    return `${formatter.format(product.priceMin)} - ${formatter.format(product.priceMax)}`;
  }

  return formatter.format(
    typeof product.priceMin === 'number' ? product.priceMin : product.priceMax || 0,
  );
}

export function BrandCandidateReviewDrawer({
  open,
  loading,
  candidate,
  detail,
  onClose,
  onBind,
  onCreateChild,
  onCreateCanonical,
  onResolve,
}: BrandCandidateReviewDrawerProps) {
  const currentCandidate = detail || candidate;
  const evidenceCandidate =
    currentCandidate && hasEvidence(currentCandidate) ? currentCandidate : null;
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const productDetailKey = useMemo(
    () => (selectedProductId ? `/products/${selectedProductId}` : null),
    [selectedProductId],
  );

  const { data: selectedProduct, isLoading: selectedProductLoading } = useSWR<Product>(
    productDetailKey,
    fetcher,
    { revalidateOnFocus: false },
  );

  const previewImages = useMemo(() => {
    if (!selectedProduct) return [];

    const images = [
      selectedProduct.mainImage,
      ...(selectedProduct.images || []),
      ...(selectedProduct.detailImages || []),
    ].filter((image): image is string => Boolean(image));

    return [...new Set(images)];
  }, [selectedProduct]);

  return (
    <>
      <Drawer
        title={currentCandidate ? `审核证据: ${currentCandidate.rawBrandName}` : '审核证据'}
        placement="right"
        width={720}
        open={open}
        onClose={onClose}
        destroyOnClose={false}
        extra={
          candidate ? (
            <Button type="primary" onClick={() => onBind(candidate)}>
              绑定现有品牌
            </Button>
          ) : null
        }
      >
        {currentCandidate ? (
          <Space direction="vertical" size={16} className="w-full">
          <Alert
            type="info"
            showIcon
            message="专家审核建议"
            description="当前主流程里，AI 未识别出的品牌会优先绑定正式兜底品牌 Design，不再默认进入候选池。这里的候选更多来自历史存量、人工修复或例外来源。先看样本商品是否稳定指向同一品牌，再决定是绑定、Unknown、Inspired 还是 Invalid。"
          />

          <Card size="small">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="候选品牌">
                <span translate="no">{currentCandidate.rawBrandName}</span>
              </Descriptions.Item>
              <Descriptions.Item label="规范化名">
                <span translate="no">{currentCandidate.normalizedBrandName}</span>
              </Descriptions.Item>
              <Descriptions.Item label="建议品牌">
                {currentCandidate.suggestedBrand?.name ? (
                  <Space size={4} wrap>
                    <span translate="no">{currentCandidate.suggestedBrand.name}</span>
                    {currentCandidate.suggestedRelationType ? (
                      <Tag>{currentCandidate.suggestedRelationType}</Tag>
                    ) : null}
                  </Space>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="候选置信度">
                {formatConfidence(currentCandidate.confidence)}
              </Descriptions.Item>
              <Descriptions.Item label="命中数">
                {currentCandidate.hitCount}
              </Descriptions.Item>
              <Descriptions.Item label="样本商品数">
                {currentCandidate.sampleProductCount}
              </Descriptions.Item>
              <Descriptions.Item label="平均样本置信度">
                {formatConfidence(evidenceCandidate?.averageMatchConfidence)}
              </Descriptions.Item>
              <Descriptions.Item label="最近出现">
                {formatDateTime(currentCandidate.lastSeenAt)}
              </Descriptions.Item>
              <Descriptions.Item label="来源">
                {currentCandidate.source || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="审核状态">
                <Tag>{currentCandidate.reviewStatus}</Tag>
              </Descriptions.Item>
            </Descriptions>

            {evidenceCandidate ? (
              <>
                <Divider className="my-4" />
                <div className="mb-3">
                  <div className="mb-2 text-sm font-medium text-gray-700">风险标签</div>
                  <Space size={[8, 8]} wrap>
                    {evidenceCandidate.riskFlags.length > 0 ? (
                      evidenceCandidate.riskFlags.map((flag) => (
                        <Tag color="volcano" key={flag}>
                          {flag}
                        </Tag>
                      ))
                    ) : (
                      <Tag color="green">暂未发现显著风险</Tag>
                    )}
                  </Space>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <div className="mb-2 text-sm font-medium text-gray-700">Top 类目</div>
                    <Space size={[8, 8]} wrap>
                      {evidenceCandidate.topCategories.length > 0 ? (
                        evidenceCandidate.topCategories.map((item) => (
                          <Tag key={item.label}>{item.label} {item.count}</Tag>
                        ))
                      ) : (
                        <Tag>暂无</Tag>
                      )}
                    </Space>
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-medium text-gray-700">Top 店铺</div>
                    <Space size={[8, 8]} wrap>
                      {evidenceCandidate.topShops.length > 0 ? (
                        evidenceCandidate.topShops.map((item) => (
                          <Tag key={item.label}>{item.label} {item.count}</Tag>
                        ))
                      ) : (
                        <Tag>暂无</Tag>
                      )}
                    </Space>
                  </div>
                </div>
              </>
            ) : null}
          </Card>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <Typography.Title level={5} className="!mb-0">
                相关商品样本
              </Typography.Title>
              <div className="text-xs text-gray-500">
                样本优先用于判断是否为同一 canonical、是否为副线/联名、是否应归类 Inspired
              </div>
            </div>

            {evidenceCandidate && evidenceCandidate.sampleProducts.length > 0 ? (
              <Image.PreviewGroup>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {evidenceCandidate.sampleProducts.map((product) => (
                    <Card key={product.id} size="small">
                      <div className="flex gap-3">
                        {product.mainImage ? (
                          <Image
                            src={product.mainImage}
                            alt={product.title}
                            width={96}
                            height={96}
                            className="rounded border object-cover"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <div className="flex h-24 w-24 items-center justify-center rounded border bg-gray-50 text-xs text-gray-400">
                            无图
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate font-medium text-gray-900">
                                {product.title}
                              </div>
                              <div className="mt-1 text-xs text-gray-500">
                                入队时间: {formatDateTime(product.candidateItemCreatedAt)}
                              </div>
                            </div>
                            <Tag color={productStatusColors[product.status] || 'default'}>
                              {product.status}
                            </Tag>
                          </div>

                          <Space size={[8, 8]} wrap className="mb-2">
                            {product.primaryCategory?.name ? (
                              <Tag>{product.primaryCategory.name}</Tag>
                            ) : null}
                            {product.weidianShopName ? <Tag>{product.weidianShopName}</Tag> : null}
                            {product.brand?.name ? (
                              <Tag color={isDesignFallbackBrand(product) ? 'gold' : 'blue'}>
                                正式品牌: {product.brand.name}
                                {isDesignFallbackBrand(product) ? ' (兜底)' : ''}
                              </Tag>
                            ) : (
                              <Tag>未绑定正式品牌</Tag>
                            )}
                            {product.aiBrandName ? (
                              <Tag color="gold">AI 品牌: {product.aiBrandName}</Tag>
                            ) : null}
                          </Space>

                          <div className="grid grid-cols-1 gap-1 text-sm text-gray-600 md:grid-cols-2">
                            <div>价格: {formatPrice(product)}</div>
                            <div>样本置信度: {formatConfidence(product.matchConfidence)}</div>
                            <div>AI 置信度: {formatConfidence(product.brandConfidence)}</div>
                            <div className="truncate">Slug: {product.slug || '-'}</div>
                          </div>

                          <Space size={12} wrap className="mt-2 text-sm">
                            <Button
                              size="small"
                              onClick={() => setSelectedProductId(product.id)}
                            >
                              查看详情
                            </Button>
                            <Link
                              href={`/admin/products/${product.id}`}
                              target="_blank"
                              className="text-blue-600 hover:text-blue-700"
                            >
                              编辑商品
                            </Link>
                            {product.sourceUrl ? (
                              <a
                                href={product.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-orange-500 hover:text-orange-600"
                              >
                                查看来源商品
                              </a>
                            ) : null}
                          </Space>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </Image.PreviewGroup>
            ) : (
              <Card size="small">
                <Empty description="当前候选还没有可用的商品样本" />
              </Card>
            )}
          </div>

          {candidate ? (
            <Space wrap>
              <Button onClick={() => onBind(candidate)} type="primary">
                绑定现有品牌
              </Button>
              <Button onClick={() => onCreateChild(candidate)}>
                创建子品牌
              </Button>
              <Button onClick={() => onCreateCanonical(candidate)}>
                创建正式品牌
              </Button>
              <Button onClick={() => onResolve(candidate, 'classify_unknown')}>
                标记 Unknown
              </Button>
              <Button onClick={() => onResolve(candidate, 'classify_inspired')}>
                标记 Inspired
              </Button>
              <Button danger onClick={() => onResolve(candidate, 'classify_invalid')}>
                标记 Invalid
              </Button>
            </Space>
          ) : null}
          </Space>
        ) : (
          <Empty description={loading ? '加载审核证据中...' : '请选择候选品牌'} />
        )}
      </Drawer>

      <Drawer
        title={selectedProduct ? `商品摘要: ${selectedProduct.title}` : '商品摘要'}
        placement="right"
        width={560}
        open={Boolean(selectedProductId)}
        onClose={() => setSelectedProductId(null)}
        destroyOnClose={false}
      >
        {selectedProduct ? (
          <Space direction="vertical" size={16} className="w-full">
            {previewImages.length > 0 ? (
              <Image.PreviewGroup>
                <div className="grid grid-cols-2 gap-3">
                  {previewImages.slice(0, 6).map((image) => (
                    <Image
                      key={image}
                      src={image}
                      alt={selectedProduct.title}
                      width="100%"
                      height={160}
                      className="rounded border object-cover"
                      style={{ objectFit: 'cover' }}
                    />
                  ))}
                </div>
              </Image.PreviewGroup>
            ) : (
              <Empty description="暂无商品图片" />
            )}

            <Card size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="商品标题">
                  {selectedProduct.title}
                </Descriptions.Item>
                <Descriptions.Item label="正式品牌">
                  {selectedProduct.brand?.name
                    ? `${selectedProduct.brand.name}${
                        selectedProduct.brand.slug === 'design' ? ' (兜底)' : ''
                      }`
                    : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="AI 品牌">
                  {selectedProduct.aiBrandName || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="主分类">
                  {selectedProduct.primaryCategory?.name || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="店铺">
                  {selectedProduct.weidianShopName || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="价格">
                  {selectedProduct.priceMin || selectedProduct.priceMax
                    ? `${selectedProduct.currency || 'CNY'} ${selectedProduct.priceMin ?? '-'} - ${selectedProduct.priceMax ?? '-'}`
                    : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={productStatusColors[selectedProduct.status || ''] || 'default'}>
                    {selectedProduct.status || '-'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="SKU 数量">
                  {selectedProduct.skus?.length || 0}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Space wrap>
              <Link
                href={`/admin/products/${selectedProduct.id}`}
                target="_blank"
                className="text-blue-600 hover:text-blue-700"
              >
                进入商品编辑页
              </Link>
              {selectedProduct.sourceUrl ? (
                <a
                  href={selectedProduct.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-500 hover:text-orange-600"
                >
                  查看来源商品
                </a>
              ) : null}
            </Space>
          </Space>
        ) : (
          <Empty description={selectedProductLoading ? '加载商品摘要中...' : '请选择样本商品'} />
        )}
      </Drawer>
    </>
  );
}
