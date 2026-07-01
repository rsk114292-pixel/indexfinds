'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  App,
  Alert,
  Card,
  Input,
  Button,
  Image,
  Checkbox,
  Tag,
  Spin,
  Space,
  Progress,
} from 'antd';
import {
  SearchOutlined,
  ScissorOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ExportOutlined,
  ForwardOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FastForwardOutlined,
} from '@ant-design/icons';
import { post, get } from '@/lib/api';
import { useRouter } from 'next/navigation';
import type { SplitPreview } from '@/types/sku-split';
import { matchTypeLabels } from '@/types/sku-split';

const { TextArea } = Input;

interface UrlResult {
  url: string;
  status: 'pending' | 'prefetching' | 'ready' | 'reviewing' | 'executing' | 'done' | 'skipped' | 'failed';
  preview?: SplitPreview;
  error?: string;
  jobId?: string;
  selectedCount?: number;
}

type Phase = 'input' | 'pipeline' | 'done';

const TERMINAL_RESULT_STATUSES: UrlResult['status'][] = [
  'done',
  'skipped',
  'failed',
];

export default function SkuSplitBatchPage() {
  const router = useRouter();
  const { message } = App.useApp();

  const [phase, setPhase] = useState<Phase>('input');
  const [urlText, setUrlText] = useState('');
  const [results, setResults] = useState<UrlResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAttrIds, setSelectedAttrIds] = useState<number[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [submittingAutoBatch, setSubmittingAutoBatch] = useState(false);
  const abortRef = useRef(false);
  // 批次号需要同步可读，避免 setState 异步导致首个任务漏传 batchId。
  const batchIdRef = useRef('');

  // 解析 URL 列表
  const parseUrls = (text: string): string[] => {
    const items = text
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return [...new Set(items)];
  };

  const parsedUrls = useMemo(() => parseUrls(urlText), [urlText]);
  const hasIncompletePipeline = useMemo(
    () =>
      phase === 'pipeline' &&
      results.some((result) => !TERMINAL_RESULT_STATUSES.includes(result.status)),
    [phase, results],
  );

  useEffect(() => {
    if (!hasIncompletePipeline) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasIncompletePipeline]);

  // 预加载单个 URL（仅抓取微店数据，不生成向量）
  const prefetchOne = async (url: string): Promise<void> => {
    try {
      await post('/products/sku-split/prefetch', { weidianUrl: url });
    } catch {
      // 预加载失败不阻塞，preview 时会重新抓取
    }
  };

  // 等待拆分 job 完成（轮询，确保产品入库后再处理下一个）
  const waitForJobCompletion = async (jobId: string): Promise<void> => {
    const terminalStatuses = ['completed', 'partial_failed', 'failed'];
    for (let i = 0; i < 120; i++) {
      // 最多等 10 分钟
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const job = await get<{ status: string }>(
          `/products/sku-split/${jobId}`,
        );
        if (terminalStatuses.includes(job.status)) return;
      } catch {
        // 查询失败继续轮询
      }
    }
  };

  // 分析单个 URL（使用缓存数据 + 实时去重）
  const analyzeOne = async (url: string): Promise<SplitPreview> => {
    return post<SplitPreview>('/products/sku-split/preview', {
      weidianUrl: url,
    });
  };

  // 执行拆分
  const executeOne = async (
    preview: SplitPreview,
    attrIds: number[],
  ): Promise<string> => {
    const result = await post<{ jobId: string }>('/products/sku-split', {
      weidianItemId: preview.weidianItemId,
      selectedAttrIds: attrIds,
      batchId: batchIdRef.current || undefined,
    });
    return result.jobId;
  };

  // 更新单个结果
  const updateResult = useCallback(
    (index: number, patch: Partial<UrlResult>) => {
      setResults((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], ...patch };
        return next;
      });
    },
    [],
  );

  // 开始流水线
  const handleStart = async () => {
    const urls = parsedUrls;
    if (urls.length === 0) {
      message.warning('请输入至少一个微店链接');
      return;
    }

    setStarting(true);
    batchIdRef.current = crypto.randomUUID();
    abortRef.current = false;

    const initial: UrlResult[] = urls.map((url) => ({
      url,
      status: 'pending',
    }));
    setResults(initial);
    setPhase('pipeline');
    setCurrentIndex(0);

    // 直接分析第一个，processUrl 内部会触发后续 URL 的预加载
    await processUrl(0, urls, initial);
    setStarting(false);
  };

  const confirmLeaveIfNeeded = useCallback(() => {
    if (!hasIncompletePipeline) return true;
    return window.confirm(
      '批量拆分仍在进行中。离开页面会中断尚未提交的链接，只有已经提交到服务端的任务会继续执行。确定离开吗？',
    );
  }, [hasIncompletePipeline]);

  // 处理单个 URL：预加载下一个 → 分析当前 → 等待用户审核
  const processUrl = async (
    index: number,
    urls: string[],
    currentResults: UrlResult[],
  ) => {
    if (abortRef.current || index >= urls.length) {
      setPhase('done');
      return;
    }

    setCurrentIndex(index);
    setAnalyzing(true);

    // 后台预加载下一个 URL 的微店数据（仅抓取，不生成向量）
    if (index + 1 < urls.length && currentResults[index + 1]?.status === 'pending') {
      updateResult(index + 1, { status: 'prefetching' });
      prefetchOne(urls[index + 1]); // 不 await
    }

    try {
      const preview = await analyzeOne(urls[index]);
      updateResult(index, { status: 'reviewing', preview });
      setSelectedAttrIds(
        preview.variants
          .filter((v) => !v.duplicateInfo)
          .map((v) => v.attrId),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '分析失败';
      updateResult(index, { status: 'failed', error: msg });
    } finally {
      setAnalyzing(false);
    }
  };

  // 用户确认拆分当前 URL → 执行 → 等待完成 → 下一个
  const handleConfirm = async () => {
    const current = results[currentIndex];
    if (!current?.preview || selectedAttrIds.length === 0) return;

    setExecuting(true);
    try {
      const jobId = await executeOne(current.preview, selectedAttrIds);
      updateResult(currentIndex, {
        status: 'executing' as UrlResult['status'],
        jobId,
        selectedCount: selectedAttrIds.length,
      });
      message.info(
        `${current.preview.weidianTitle || current.url}: 拆分中，等待完成...`,
      );
      // 等待 job 完成，确保产品入库 + 向量写入 DB
      await waitForJobCompletion(jobId);
      updateResult(currentIndex, { status: 'done' });
      message.success('拆分完成');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '执行失败';
      updateResult(currentIndex, { status: 'failed', error: msg });
      message.error(msg);
    } finally {
      setExecuting(false);
    }

    // 下一个（前一个已完成，去重准确）
    await processUrl(currentIndex + 1, results.map((r) => r.url), results);
  };

  // 跳过当前 URL
  const handleSkip = async () => {
    updateResult(currentIndex, { status: 'skipped' });
    await processUrl(currentIndex + 1, results.map((r) => r.url), results);
  };

  // 全部自动（剩余 URL 交给后台批次处理，可安全离开页面）
  const handleAutoAll = async () => {
    const remainingUrls = results.slice(currentIndex).map((r) => r.url);
    if (remainingUrls.length === 0) {
      message.info('没有剩余链接需要自动拆分');
      return;
    }

    setSubmittingAutoBatch(true);
    try {
      const batch = await post<{ batchId: string; totalUrls: number }>(
        '/products/sku-split/batch/auto',
        { weidianUrls: remainingUrls },
      );
      message.success(
        `后台自动批次已创建，${batch.totalUrls} 个链接将持续处理。现在可以安全离开此页面。`,
      );
      router.push('/admin/products/sku-split');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '提交后台自动批次失败';
      message.error(msg);
    } finally {
      setSubmittingAutoBatch(false);
    }
  };

  const current = results[currentIndex];
  const preview = current?.preview;
  const newVariants =
    preview?.variants.filter((v) => !v.duplicateInfo) ?? [];
  const dupVariants =
    preview?.variants.filter((v) => !!v.duplicateInfo) ?? [];
  const allSelected =
    preview && selectedAttrIds.length === preview.variants.length;

  const doneCount = results.filter(
    (r) => TERMINAL_RESULT_STATUSES.includes(r.status),
  ).length;
  const successCount = results.filter((r) => r.status === 'done').length;
  const skipCount = results.filter((r) => r.status === 'skipped').length;
  const failCount = results.filter((r) => r.status === 'failed').length;
  const totalVariantsCreated = results
    .filter((r) => r.status === 'done')
    .reduce((sum, r) => sum + (r.selectedCount ?? 0), 0);

  return (
    <div>
      <div className="mb-4">
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => {
            if (!confirmLeaveIfNeeded()) return;
            router.push('/admin/products/sku-split');
          }}
          className="px-0 mb-2"
        >
          返回任务列表
        </Button>
        <h1 className="text-2xl font-bold">批量 SKU 拆分</h1>
        <p className="text-gray-500 mt-1">
          粘贴多个微店链接，逐个审核并拆分
        </p>
      </div>

      {/* Phase 1: 输入 */}
      {phase === 'input' && (
        <Card>
          <Alert
            className="mb-4"
            type="warning"
            showIcon
            message="“全部自动”需要保持此页面打开"
            description="逐个审核模式需要保持页面打开；点击“全部自动”后会切换为后台批次处理，可安全离开页面。"
          />
          <div className="mb-3">
            <TextArea
              rows={10}
              placeholder={'粘贴微店链接或商品 ID，每行一个\n\n例如:\nhttps://weidian.com/item.html?itemID=7645742253\n7642401847\nhttps://shop.weidian.com/item.html?itemID=7645599299'}
              value={urlText}
              onChange={(e) => setUrlText(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {parsedUrls.length > 0
                ? `${parsedUrls.length} 个链接（已去重）`
                : ''}
            </span>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              size="large"
              onClick={handleStart}
              loading={starting}
              disabled={parsedUrls.length === 0}
            >
              开始分析 ({parsedUrls.length})
            </Button>
          </div>
        </Card>
      )}

      {/* Phase 2: 流水线审核 */}
      {phase === 'pipeline' && (
        <>
          <Alert
            className="mb-4"
            type="warning"
            showIcon
            message="批量流程进行中"
            description="逐个审核模式请保持当前页面打开。若要安全离开，请点击“全部自动”，把剩余链接交给后台批次处理。"
          />
          {/* 进度条 */}
          <Card className="mb-4" size="small">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                进度: {doneCount} / {results.length}
              </span>
              <Space size="small">
                <Tag color="green">{successCount} 完成</Tag>
                <Tag>{skipCount} 跳过</Tag>
                <Tag color="red">{failCount} 失败</Tag>
              </Space>
            </div>
            <Progress
              percent={
                results.length > 0
                  ? Math.round((doneCount / results.length) * 100)
                  : 0
              }
              size="small"
            />
          </Card>

          {/* 当前审核项 */}
          {executing && (
            <Card className="mb-4">
              <div className="text-center py-8">
                <Spin size="large" />
                <p className="mt-3 text-gray-500">
                  正在拆分第 {currentIndex + 1}/{results.length} 个链接，等待产品入库...
                </p>
              </div>
            </Card>
          )}

          {analyzing && !executing && (
            <Card className="mb-4">
              <div className="text-center py-8">
                <Spin size="large" />
                <p className="mt-3 text-gray-500">
                  正在分析第 {currentIndex + 1}/{results.length} 个链接...
                </p>
              </div>
            </Card>
          )}

          {current?.status === 'reviewing' && preview && (
            <Card
              className="mb-4"
              title={
                <div>
                  <span>
                    第 {currentIndex + 1}/{results.length} 个
                  </span>
                  <span className="ml-3 text-sm font-normal text-gray-500">
                    维度: {preview.splitDimension} · {preview.totalVariants}{' '}
                    个变体
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
                    icon={<ForwardOutlined />}
                    onClick={handleSkip}
                  >
                    跳过
                  </Button>
                  <Button
                    type="primary"
                    icon={<ScissorOutlined />}
                    onClick={handleConfirm}
                    loading={executing}
                    disabled={selectedAttrIds.length === 0}
                  >
                    确认拆分 ({selectedAttrIds.length})
                  </Button>
                  <Button
                    icon={<FastForwardOutlined />}
                    onClick={handleAutoAll}
                    loading={submittingAutoBatch}
                    title="剩余链接全部用智能默认自动处理"
                  >
                    全部自动
                  </Button>
                </Space>
              }
            >
              {/* 可直接拆分 */}
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
                            <p
                              className="text-xs mt-1 truncate"
                              title={v.value}
                            >
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

              {/* 已存在产品 */}
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
                            checked
                              ? 'bg-orange-100'
                              : 'bg-orange-50 hover:bg-orange-100/50'
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
                              <p
                                className="text-sm truncate"
                                title={v.value}
                              >
                                {v.value}
                              </p>
                              <p className="text-xs text-gray-500">
                                ¥{v.price} · {v.skuCount} 尺码
                              </p>
                            </div>
                          </div>
                          <ArrowRightOutlined className="text-orange-400 flex-shrink-0" />
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
                                {matchTypeLabels[info.matchType] ||
                                  info.matchType}
                                {info.similarity != null &&
                                  ` · ${info.similarity}%`}
                                {info.matchedShopName &&
                                  ` · ${info.matchedShopName}`}
                              </p>
                            </div>
                          </div>
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

          {current?.status === 'failed' && (
            <Card className="mb-4">
              <div className="text-center py-6">
                <CloseCircleOutlined className="text-3xl text-red-500 mb-2" />
                <p className="text-red-600 mb-3">{current.error}</p>
                <Space>
                  <Button onClick={handleSkip}>
                    跳过，继续下一个
                  </Button>
                </Space>
              </div>
            </Card>
          )}

          {/* 已处理列表 */}
          {doneCount > 0 && (
            <Card title="已处理" size="small">
              <div className="space-y-1">
                {results
                  .filter(
                    (r) =>
                      r.status === 'done' ||
                      r.status === 'skipped' ||
                      r.status === 'failed',
                  )
                  .map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm py-1"
                    >
                      {r.status === 'done' && (
                        <CheckCircleOutlined className="text-green-500" />
                      )}
                      {r.status === 'skipped' && (
                        <ForwardOutlined className="text-gray-400" />
                      )}
                      {r.status === 'failed' && (
                        <CloseCircleOutlined className="text-red-500" />
                      )}
                      <span className="text-gray-600 truncate flex-1">
                        {r.preview?.weidianTitle || r.url}
                      </span>
                      {r.status === 'done' && (
                        <Tag color="green">
                          {r.selectedCount} 个变体
                        </Tag>
                      )}
                      {r.status === 'skipped' && <Tag>跳过</Tag>}
                      {r.status === 'failed' && (
                        <Tag color="red">失败</Tag>
                      )}
                      {r.jobId && (
                        <Button
                          type="link"
                          size="small"
                          onClick={() =>
                            router.push(
                              `/admin/products/sku-split/${r.jobId}`,
                            )
                          }
                        >
                          详情
                        </Button>
                      )}
                    </div>
                  ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Phase 3: 完成汇总 */}
      {phase === 'done' && (
        <Card>
          <div className="text-center py-8">
            <CheckCircleOutlined className="text-5xl text-green-500 mb-4" />
            <h2 className="text-xl font-bold mb-4">批量拆分完成</h2>
            <div className="flex justify-center gap-8 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {successCount}
                </div>
                <div className="text-sm text-gray-500">成功</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {totalVariantsCreated}
                </div>
                <div className="text-sm text-gray-500">产品创建</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-400">
                  {skipCount}
                </div>
                <div className="text-sm text-gray-500">跳过</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">
                  {failCount}
                </div>
                <div className="text-sm text-gray-500">失败</div>
              </div>
            </div>
            <Space>
              <Button
                type="primary"
                onClick={() => router.push('/admin/products/sku-split')}
              >
                查看任务列表
              </Button>
              <Button
                onClick={() => {
                  setPhase('input');
                  setResults([]);
                  setUrlText('');
                  setCurrentIndex(0);
                }}
              >
                继续批量拆分
              </Button>
            </Space>
          </div>

          {/* 详细结果列表 */}
          {results.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <h3 className="text-sm font-medium mb-3">处理详情</h3>
              <div className="space-y-1">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm py-1"
                  >
                    {r.status === 'done' && (
                      <CheckCircleOutlined className="text-green-500" />
                    )}
                    {r.status === 'skipped' && (
                      <ForwardOutlined className="text-gray-400" />
                    )}
                    {r.status === 'failed' && (
                      <CloseCircleOutlined className="text-red-500" />
                    )}
                    {r.status === 'pending' && (
                      <span className="text-gray-300">-</span>
                    )}
                    <span className="text-gray-600 truncate flex-1">
                      {r.preview?.weidianTitle || r.url}
                    </span>
                    {r.status === 'done' && (
                      <Tag color="green">{r.selectedCount} 个变体</Tag>
                    )}
                    {r.status === 'skipped' && <Tag>跳过</Tag>}
                    {r.status === 'failed' && (
                      <Tag color="red" title={r.error}>
                        {r.error?.slice(0, 20) || '失败'}
                      </Tag>
                    )}
                    {r.jobId && (
                      <Button
                        type="link"
                        size="small"
                        onClick={() =>
                          router.push(
                            `/admin/products/sku-split/${r.jobId}`,
                          )
                        }
                      >
                        详情
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
