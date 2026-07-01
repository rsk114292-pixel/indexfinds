'use client';

import { useState } from 'react';
import {
  App,
  Card,
  Input,
  Button,
  Image,
  Checkbox,
  Tag,
  Spin,
  Space,
} from 'antd';
import {
  SearchOutlined,
  ScissorOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { post } from '@/lib/api';
import { useRouter } from 'next/navigation';
import type { SplitPreview } from '@/types/sku-split';
import { matchTypeLabels } from '@/types/sku-split';

export default function SkuSplitNewPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [weidianUrl, setWeidianUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState<SplitPreview | null>(null);
  const [selectedAttrIds, setSelectedAttrIds] = useState<number[]>([]);
  const [executing, setExecuting] = useState(false);

  const handleAnalyze = async () => {
    if (!weidianUrl.trim()) return;
    setAnalyzing(true);
    setPreview(null);
    try {
      const result = await post<SplitPreview>('/products/sku-split/preview', {
        weidianUrl: weidianUrl.trim(),
      });
      setPreview(result);
      setSelectedAttrIds(
        result.variants
          .filter((v) => !v.duplicateInfo)
          .map((v) => v.attrId),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '分析失败';
      message.error(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExecute = async () => {
    if (!preview || selectedAttrIds.length === 0) return;
    setExecuting(true);
    try {
      const result = await post<{ jobId: string }>('/products/sku-split', {
        weidianItemId: preview.weidianItemId,
        selectedAttrIds,
      });
      message.success(`拆分任务已创建，共 ${selectedAttrIds.length} 个变体`);
      router.push(`/admin/products/sku-split/${result.jobId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '创建任务失败';
      message.error(msg);
    } finally {
      setExecuting(false);
    }
  };

  // 分区：正常变体 vs 重复变体
  const newVariants = preview?.variants.filter((v) => !v.duplicateInfo) ?? [];
  const dupVariants = preview?.variants.filter((v) => !!v.duplicateInfo) ?? [];

  const allSelected =
    preview && selectedAttrIds.length === preview.variants.length;

  return (
    <div>
      <div className="mb-4">
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push('/admin/products/sku-split')}
          className="px-0 mb-2"
        >
          返回任务列表
        </Button>
        <h1 className="text-2xl font-bold">新建 SKU 拆分</h1>
        <p className="text-gray-500 mt-1">
          粘贴微店链接，分析并选择要拆分的变体
        </p>
      </div>

      {/* 输入区 */}
      <Card className="mb-4">
        <div className="flex gap-3">
          <Input
            placeholder="粘贴微店链接或商品 ID"
            value={weidianUrl}
            onChange={(e) => setWeidianUrl(e.target.value)}
            onPressEnter={handleAnalyze}
            size="large"
            allowClear
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            size="large"
            onClick={handleAnalyze}
            loading={analyzing}
          >
            分析
          </Button>
        </div>
      </Card>

      {/* 分析中 */}
      {analyzing && (
        <Card className="mb-4">
          <div className="text-center py-8">
            <Spin size="large" />
            <p className="mt-3 text-gray-500">正在分析微店数据...</p>
          </div>
        </Card>
      )}

      {/* 预览结果 */}
      {preview && (
        <Card
          className="mb-4"
          title={
            <div>
              <span>拆分预览</span>
              <span className="ml-3 text-sm font-normal text-gray-500">
                维度: {preview.splitDimension} · {preview.totalVariants} 个变体
              </span>
              {preview.weidianTitle && (
                <span className="ml-3 text-xs font-normal text-gray-400">
                  ({preview.weidianTitle})
                </span>
              )}
            </div>
          }
          extra={
            <Space>
              <Button
                size="small"
                onClick={() =>
                  setSelectedAttrIds(
                    allSelected
                      ? []
                      : preview.variants.map((v) => v.attrId),
                  )
                }
              >
                {allSelected ? '全不选' : '全选'}
              </Button>
              <Button
                type="primary"
                icon={<ScissorOutlined />}
                onClick={handleExecute}
                loading={executing}
                disabled={selectedAttrIds.length === 0}
              >
                开始拆分 ({selectedAttrIds.length})
              </Button>
            </Space>
          }
        >
          {/* 可直接拆分区域 */}
          <div className="mb-1">
            <span className="text-sm font-medium text-gray-700">
              可直接拆分
            </span>
            <Tag className="ml-2">{newVariants.length}</Tag>
          </div>
          {newVariants.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
              {newVariants.map((v) => {
                const checked = selectedAttrIds.includes(v.attrId);
                return (
                  <div
                    key={v.attrId}
                    className={`border rounded-lg p-2 cursor-pointer transition-colors ${
                      checked
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() =>
                      setSelectedAttrIds((prev) =>
                        checked
                          ? prev.filter((id) => id !== v.attrId)
                          : [...prev, v.attrId],
                      )
                    }
                  >
                    <div className="flex items-start gap-1.5">
                      <Checkbox checked={checked} className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <Image
                          src={v.imageUrl}
                          alt={v.value}
                          width={80}
                          height={80}
                          className="rounded object-cover"
                          preview={false}
                        />
                        <p className="text-xs mt-1 truncate" title={v.value}>
                          {v.value}
                        </p>
                        <p className="text-xs text-gray-500">
                          ¥{v.price} · {v.skuCount} 尺码
                        </p>
                        {v.imageConfidence === 'low' && (
                          <Tag
                            color="warning"
                            className="mt-1 mr-0 text-[10px]"
                          >
                            兜底图
                          </Tag>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-6">无新变体</p>
          )}

          {/* 已存在产品区域 */}
          {dupVariants.length > 0 && (
            <>
              <div className="mb-2">
                <span className="text-sm font-medium text-orange-600">
                  已存在产品
                </span>
                <Tag color="orange" className="ml-2">
                  {dupVariants.length}
                </Tag>
                <span className="text-xs text-gray-400 ml-2">
                  默认不勾选，勾选后将强制重新创建
                </span>
              </div>
              <div className="border border-orange-200 rounded-lg overflow-hidden">
                {dupVariants.map((v, idx) => {
                  const checked = selectedAttrIds.includes(v.attrId);
                  const info = v.duplicateInfo!;
                  return (
                    <div
                      key={v.attrId}
                      className={`flex items-center gap-4 p-3 cursor-pointer transition-colors ${
                        checked ? 'bg-orange-100' : 'bg-orange-50 hover:bg-orange-100/50'
                      } ${idx > 0 ? 'border-t border-orange-200' : ''}`}
                      onClick={() =>
                        setSelectedAttrIds((prev) =>
                          checked
                            ? prev.filter((id) => id !== v.attrId)
                            : [...prev, v.attrId],
                        )
                      }
                    >
                      <Checkbox checked={checked} />

                      {/* 左：当前变体 */}
                      <div className="flex items-center gap-2 min-w-0 w-48 flex-shrink-0">
                        <Image
                          src={v.imageUrl}
                          alt={v.value}
                          width={48}
                          height={48}
                          className="rounded object-cover flex-shrink-0"
                          preview={false}
                        />
                        <div className="min-w-0">
                          <p className="text-sm truncate" title={v.value}>
                            {v.value}
                          </p>
                          <p className="text-xs text-gray-500">
                            ¥{v.price} · {v.skuCount} 尺码
                          </p>
                        </div>
                      </div>

                      {/* 箭头 */}
                      <ArrowRightOutlined className="text-orange-400 flex-shrink-0" />

                      {/* 右：已有产品 */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {info.matchedProductImage && (
                          <Image
                            src={info.matchedProductImage}
                            alt=""
                            width={48}
                            height={48}
                            className="rounded object-cover flex-shrink-0"
                            preview={false}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p
                            className="text-sm truncate"
                            title={info.matchedProductTitle}
                          >
                            {info.matchedProductTitle || '未知产品'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {matchTypeLabels[info.matchType] || info.matchType}
                            {info.similarity != null && ` · ${info.similarity}%`}
                            {info.matchedShopName && ` · ${info.matchedShopName}`}
                          </p>
                        </div>
                      </div>

                      {/* 查看链接 */}
                      <a
                        href={`/admin/products/${info.matchedProductId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 flex-shrink-0 inline-flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        查看 <ExportOutlined />
                      </a>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
