'use client';

import { useMemo } from 'react';
import { Table, Progress } from 'antd';

interface DataPoint {
  name: string;
  value: number;
}

interface BarChartProps {
  data: DataPoint[];
  title?: string;
  height?: number;
}

export default function BarChart({ data, title, height = 300 }: BarChartProps) {
  const maxValue = useMemo(
    () => Math.max(...data.map((d) => d.value), 1),
    [data],
  );

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', width: 200 },
    {
      title: '数值',
      dataIndex: 'value',
      key: 'value',
      render: (value: number) => (
        <div className="flex items-center gap-2">
          <Progress
            percent={Math.round((value / maxValue) * 100)}
            showInfo={false}
            size="small"
            style={{ width: 150 }}
          />
          <span className="font-medium">{value}</span>
        </div>
      ),
    },
  ];

  return (
    <div style={{ height }}>
      {title && <h4 className="text-lg font-medium mb-4">{title}</h4>}
      <Table
        dataSource={data}
        columns={columns}
        rowKey="name"
        pagination={false}
        size="small"
        scroll={{ y: height - 80 }}
      />
    </div>
  );
}
