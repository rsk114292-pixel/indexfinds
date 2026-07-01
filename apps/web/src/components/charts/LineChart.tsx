'use client';

import { useMemo } from 'react';
import { Table, Tooltip } from 'antd';

interface DataPoint {
  date: string;
  count: number;
}

interface LineChartProps {
  data: DataPoint[];
  prevData?: DataPoint[];
  title?: string;
  height?: number;
  showComparison?: boolean;
}

export default function LineChart({
  data,
  prevData,
  title,
  height = 300,
  showComparison = false
}: LineChartProps) {
  const maxCount = useMemo(
    () => Math.max(...data.map((d) => d.count), ...(prevData || []).map((d) => d.count), 1),
    [data, prevData],
  );

  // 合并当前和上期数据（如果有）
  const mergedData = useMemo(() => {
    if (!showComparison || !prevData || prevData.length === 0) {
      return data.map(d => ({ ...d, prevCount: undefined }));
    }

    // 简单映射：按索引对应上期数据
    return data.map((d, index) => ({
      ...d,
      prevCount: prevData[index]?.count,
    }));
  }, [data, prevData, showComparison]);

  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 150,
      render: (date: string) => {
        // 格式化日期显示
        const d = new Date(date);
        return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
      }
    },
    {
      title: '数量',
      key: 'count',
      render: (_: unknown, record: DataPoint & { prevCount?: number }) => {
        const barWidth = (record.count / maxCount) * 200;
        const prevBarWidth = record.prevCount !== undefined ? (record.prevCount / maxCount) * 200 : 0;

        return (
          <div className="space-y-1">
            {/* 当前周期 */}
            <div className="flex items-center gap-2">
              <div
                className="bg-blue-500 h-4 rounded transition-all duration-300"
                style={{ width: `${Math.max(barWidth, 4)}px` }}
              />
              <span className="text-sm font-medium">{record.count}</span>
              {showComparison && <span className="text-xs text-gray-400">本期</span>}
            </div>

            {/* 上期（如果有对比数据） */}
            {showComparison && record.prevCount !== undefined && (
              <Tooltip title="上期同日">
                <div className="flex items-center gap-2">
                  <div
                    className="bg-gray-300 h-3 rounded transition-all duration-300"
                    style={{ width: `${Math.max(prevBarWidth, 4)}px` }}
                  />
                  <span className="text-xs text-gray-400">{record.prevCount} 上期</span>
                </div>
              </Tooltip>
            )}
          </div>
        );
      },
    },
  ];

  // 计算总计
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const prevTotal = prevData?.reduce((sum, d) => sum + d.count, 0) || 0;

  return (
    <div style={{ minHeight: height }}>
      {title && <h4 className="text-lg font-medium mb-4">{title}</h4>}

      {/* 汇总信息 */}
      {showComparison && prevData && prevData.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg flex gap-6 text-sm">
          <div>
            <span className="text-gray-500">本期合计：</span>
            <span className="font-medium text-blue-600">{total}</span>
          </div>
          <div>
            <span className="text-gray-500">上期合计：</span>
            <span className="font-medium text-gray-600">{prevTotal}</span>
          </div>
          <div>
            <span className="text-gray-500">变化：</span>
            <span className={`font-medium ${total >= prevTotal ? 'text-green-600' : 'text-red-600'}`}>
              {total >= prevTotal ? '+' : ''}{prevTotal === 0 ? (total > 0 ? '+100' : '0') : Math.round(((total - prevTotal) / prevTotal) * 100)}%
            </span>
          </div>
        </div>
      )}

      <Table
        dataSource={mergedData}
        columns={columns}
        rowKey="date"
        pagination={false}
        size="small"
        scroll={{ y: height - (showComparison ? 140 : 80) }}
      />
    </div>
  );
}
