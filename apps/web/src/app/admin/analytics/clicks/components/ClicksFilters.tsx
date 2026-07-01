'use client';

import type dayjs from 'dayjs';
import { Button, DatePicker, Input, Segmented, Select } from 'antd';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { AnalyticsScope } from '../types';

const { RangePicker } = DatePicker;

interface ClicksFiltersProps {
  dateRange: [dayjs.Dayjs, dayjs.Dayjs];
  sourceFilter?: string;
  sourceOptions: Array<{ value: string; label: string }>;
  platformFilter?: string;
  platformOptions: Array<{ value: string; label: string }>;
  productKeywordInput: string;
  scope: AnalyticsScope;
  exporting: boolean;
  canExport: boolean;
  onDateRangeChange: (value: [dayjs.Dayjs, dayjs.Dayjs]) => void;
  onSourceChange: (value?: string) => void;
  onPlatformChange: (value?: string) => void;
  onProductKeywordInputChange: (value: string) => void;
  onProductSearch: (value: string) => void;
  onScopeChange: (value: AnalyticsScope) => void;
  onExport: () => void;
}

export default function ClicksFilters({
  dateRange,
  sourceFilter,
  sourceOptions,
  platformFilter,
  platformOptions,
  productKeywordInput,
  scope,
  exporting,
  canExport,
  onDateRangeChange,
  onSourceChange,
  onPlatformChange,
  onProductKeywordInputChange,
  onProductSearch,
  onScopeChange,
  onExport,
}: ClicksFiltersProps) {
  return (
    <div className="mb-6 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">外跳统计</h1>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={onExport}
          disabled={!canExport}
          loading={exporting}
        >
          导出 CSV
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <RangePicker
          value={dateRange}
          onChange={(dates) => {
            if (!dates) return;
            onDateRangeChange(dates as [dayjs.Dayjs, dayjs.Dayjs]);
          }}
        />
        <Select
          allowClear
          placeholder="来源"
          value={sourceFilter}
          options={sourceOptions}
          style={{ width: 140 }}
          onChange={onSourceChange}
        />
        <Select
          allowClear
          placeholder="平台"
          value={platformFilter}
          options={platformOptions}
          style={{ width: 160 }}
          onChange={onPlatformChange}
        />
        <Input.Search
          allowClear
          placeholder="商品名或商品 ID"
          value={productKeywordInput}
          onChange={(event) => onProductKeywordInputChange(event.target.value)}
          onSearch={(value) => onProductSearch(value.trim())}
          style={{ width: 260 }}
          enterButton={<SearchOutlined />}
        />
        <Segmented
          value={scope}
          options={[
            { label: '顾客口径', value: 'customer' },
            { label: '原始口径', value: 'raw' },
          ]}
          onChange={(value) => onScopeChange(value as AnalyticsScope)}
        />
      </div>
    </div>
  );
}
