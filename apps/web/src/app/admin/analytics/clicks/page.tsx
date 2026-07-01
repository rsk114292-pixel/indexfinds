'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { Alert, App, Card, Col, Progress, Row } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import { DashboardSkeleton } from '../../components/PageSkeleton';
import { exportClicksToCsv } from './clicks-export';
import {
  getDistributionItems,
  pageTypeLabels,
  platformColors,
  sourceLabels,
  viewportDeviceTypeLabels,
} from './clicks-formatters';
import ClicksFilters from './components/ClicksFilters';
import ClicksSummaryCards from './components/ClicksSummaryCards';
import ClicksTablesCard from './components/ClicksTablesCard';
import { useClicksAnalytics } from './useClicksAnalytics';
import type { AnalyticsScope } from './types';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const LazyLineChart = dynamic(() => import('@/components/charts/LineChart'), {
  loading: () => <div className="h-[350px] animate-pulse rounded bg-gray-50" />,
});

export default function ClicksAnalyticsPage() {
  const { message } = App.useApp();
  const { isReady } = useAdminAuthReady();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('day'),
    dayjs(),
  ]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sourceFilter, setSourceFilter] = useState<string>();
  const [platformFilter, setPlatformFilter] = useState<string>();
  const [productKeyword, setProductKeyword] = useState('');
  const [productKeywordInput, setProductKeywordInput] = useState('');
  const [tableMode, setTableMode] = useState<'records' | 'products'>('records');
  const [scope, setScope] = useState<AnalyticsScope>('customer');
  const [exporting, setExporting] = useState(false);

  const { data, loading } = useClicksAnalytics({
    dateRange,
    page,
    pageSize,
    sourceFilter,
    platformFilter,
    productKeyword,
    scope,
    isReady,
  });

  const sourceOptions = useMemo(
    () =>
      Object.keys(sourceLabels).map((key) => ({
        value: key,
        label: sourceLabels[key],
      })),
    [],
  );

  const platformOptions = useMemo(
    () =>
      Object.keys(data?.byPlatform || {}).map((key) => ({
        value: key,
        label: key,
      })),
    [data?.byPlatform],
  );

  const handleExport = async () => {
    if (!data) return;
    setExporting(true);
    try {
      await exportClicksToCsv(
        data,
        {
          dateRange,
          source: sourceFilter,
          platform: platformFilter,
          productKeyword,
          scope,
        },
        message,
      );
    } catch {
      message.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6">
      <ClicksFilters
        dateRange={dateRange}
        sourceFilter={sourceFilter}
        sourceOptions={sourceOptions}
        platformFilter={platformFilter}
        platformOptions={platformOptions}
        productKeywordInput={productKeywordInput}
        scope={scope}
        exporting={exporting}
        canExport={!!data && !loading}
        onDateRangeChange={(nextRange) => {
          setPage(1);
          setDateRange(nextRange);
        }}
        onSourceChange={(value) => {
          setPage(1);
          setSourceFilter(value);
        }}
        onPlatformChange={(value) => {
          setPage(1);
          setPlatformFilter(value);
        }}
        onProductKeywordInputChange={setProductKeywordInput}
        onProductSearch={(value) => {
          setPage(1);
          setProductKeyword(value);
        }}
        onScopeChange={(value) => {
          setPage(1);
          setScope(value);
        }}
        onExport={handleExport}
      />

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <Alert
            type="warning"
            showIcon
            className="mb-6"
            message={
              scope === 'customer'
                ? '当前为顾客口径：默认排除已登录 admin / super_admin 的外跳事件。购买意图按用户+商品+10 分钟去重，平台选择按用户+商品+平台+10 分钟去重。'
                : '当前为原始口径：包含管理员测试外跳和内部访问，仅用于排查埋点、采集漏数和事件审计，不建议用于经营判断。'
            }
          />

          <ClicksSummaryCards summary={data?.summary} />

          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} lg={12}>
              <Card title="页面类型分布">
                {data?.byPageType && Object.keys(data.byPageType).length > 0 ? (
                  <div className="space-y-3">
                    {getDistributionItems(data.byPageType, pageTypeLabels).map((item) => (
                      <div key={item.key}>
                        <div className="flex justify-between mb-1">
                          <span>{item.label}</span>
                          <span className="text-gray-500">
                            {item.count} ({item.percent}%)
                          </span>
                        </div>
                        <Progress percent={item.percent} showInfo={false} strokeColor="#fa8c16" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">暂无数据</div>
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="视口分布">
                {data?.byViewportDeviceType &&
                Object.keys(data.byViewportDeviceType).length > 0 ? (
                  <div className="space-y-3">
                    {getDistributionItems(
                      data.byViewportDeviceType,
                      viewportDeviceTypeLabels,
                    ).map((item) => (
                      <div key={item.key}>
                        <div className="flex justify-between mb-1">
                          <span>{item.label}</span>
                          <span className="text-gray-500">
                            {item.count} ({item.percent}%)
                          </span>
                        </div>
                        <Progress percent={item.percent} showInfo={false} strokeColor="#52c41a" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">暂无数据</div>
                )}
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} lg={12}>
              <Card title="Top 搜索词">
                {data?.topQueries && data.topQueries.length > 0 ? (
                  <div className="space-y-3">
                    {data.topQueries.map((item) => (
                      <div key={item.key} className="flex items-center justify-between">
                        <span className="truncate pr-3 text-sm text-gray-700">{item.key}</span>
                        <span className="text-sm font-medium text-gray-500">{item.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">暂无数据</div>
                )}
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} lg={12}>
              <Card title="语言分布">
                {data?.byLocale && Object.keys(data.byLocale).length > 0 ? (
                  <div className="space-y-3">
                    {getDistributionItems(data.byLocale).map((item) => (
                      <div key={item.key}>
                        <div className="flex justify-between mb-1">
                          <span>{item.label.toUpperCase()}</span>
                          <span className="text-gray-500">
                            {item.count} ({item.percent}%)
                          </span>
                        </div>
                        <Progress percent={item.percent} showInfo={false} strokeColor="#722ed1" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">暂无数据</div>
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="按钮位分布">
                {data?.byButtonVariant && Object.keys(data.byButtonVariant).length > 0 ? (
                  <div className="space-y-3">
                    {getDistributionItems(data.byButtonVariant).map((item) => (
                      <div key={item.key}>
                        <div className="flex justify-between mb-1">
                          <span>{item.label}</span>
                          <span className="text-gray-500">
                            {item.count} ({item.percent}%)
                          </span>
                        </div>
                        <Progress percent={item.percent} showInfo={false} strokeColor="#13c2c2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">暂无数据</div>
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Top 页面路径">
                {data?.topPages && data.topPages.length > 0 ? (
                  <div className="space-y-3">
                    {data.topPages.map((item) => (
                      <div key={item.key} className="flex items-center justify-between">
                        <span className="truncate pr-3 text-sm text-gray-700">{item.key}</span>
                        <span className="text-sm font-medium text-gray-500">{item.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">暂无数据</div>
                )}
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} lg={12}>
              <Card title="来源分布">
                {data?.bySource && Object.keys(data.bySource).length > 0 ? (
                  <div className="space-y-3">
                    {getDistributionItems(data.bySource, sourceLabels).map((item) => (
                      <div key={item.key}>
                        <div className="flex justify-between mb-1">
                          <span>{item.label}</span>
                          <span className="text-gray-500">
                            {item.count} ({item.percent}%)
                          </span>
                        </div>
                        <Progress percent={item.percent} showInfo={false} strokeColor="#1890ff" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">暂无数据</div>
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="平台选择分布">
                {data?.byPlatform && Object.keys(data.byPlatform).length > 0 ? (
                  <div className="space-y-3">
                    {getDistributionItems(data.byPlatform).map((item) => (
                      <div key={item.key}>
                        <div className="flex justify-between mb-1">
                          <span>{item.label}</span>
                          <span className="text-gray-500">
                            {item.count} ({item.percent}%)
                          </span>
                        </div>
                        <Progress
                          percent={item.percent}
                          showInfo={false}
                          strokeColor={platformColors[item.key] || '#666'}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">暂无数据</div>
                )}
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} className="mb-6">
            <Col span={24}>
              <Card title="购买意图趋势（本期 vs 上期）">
                <LazyLineChart
                  data={data?.byDate || []}
                  prevData={data?.prevByDate}
                  height={350}
                  showComparison={true}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={24}>
              <ClicksTablesCard
                data={data}
                page={page}
                pageSize={pageSize}
                tableMode={tableMode}
                onTableModeChange={setTableMode}
                onPaginationChange={(nextPage, nextPageSize) => {
                  setPage(nextPage);
                  setPageSize(nextPageSize);
                }}
              />
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
