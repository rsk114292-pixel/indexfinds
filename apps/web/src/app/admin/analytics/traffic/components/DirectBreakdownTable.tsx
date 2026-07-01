'use client';

import { Card, Table, Tag } from 'antd';
import { CompassOutlined } from '@ant-design/icons';
import { EmptyState } from '../../../components/EmptyState';
import { formatDirectReasonLabel } from './traffic-labels';

interface DirectBreakdown {
  reason: string;
  rawCount: number;
  count: number;
  uniqueVisitors: number;
  shareOfDirect: number;
  shareOfTotal: number;
}

const columns = [
  {
    title: 'Direct 构成',
    dataIndex: 'reason',
    key: 'reason',
    render: (reason: string) => (
      <span className="font-medium">{formatDirectReasonLabel(reason)}</span>
    ),
  },
  {
    title: '去重访问',
    dataIndex: 'count',
    key: 'count',
    sorter: (a: DirectBreakdown, b: DirectBreakdown) => a.count - b.count,
    render: (count: number, record: DirectBreakdown) => (
      <div>
        <div className="font-medium text-gray-900">{count}</div>
        <div className="text-xs text-gray-400">
          原始 {record.rawCount} / 设备 {record.uniqueVisitors}
        </div>
      </div>
    ),
  },
  {
    title: '占 Direct 比',
    dataIndex: 'shareOfDirect',
    key: 'shareOfDirect',
    sorter: (a: DirectBreakdown, b: DirectBreakdown) =>
      a.shareOfDirect - b.shareOfDirect,
    render: (value: number) => <Tag color="blue">{value}%</Tag>,
  },
  {
    title: '占总访问比',
    dataIndex: 'shareOfTotal',
    key: 'shareOfTotal',
    sorter: (a: DirectBreakdown, b: DirectBreakdown) =>
      a.shareOfTotal - b.shareOfTotal,
    render: (value: number) => <Tag>{value}%</Tag>,
  },
];

export default function DirectBreakdownTable({
  data,
}: {
  data: DirectBreakdown[];
}) {
  return (
    <Card
      title="直接/未归因访问拆解"
      extra={
        <span className="text-xs text-gray-400">
          无 UTM 且无外部 Referrer，不等于用户手动输入网址
        </span>
      }
    >
      <Table
        dataSource={data}
        columns={columns}
        rowKey="reason"
        locale={{
          emptyText: (
            <EmptyState
              icon={<CompassOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
              title="暂无直接/未归因拆解数据"
              description="选定时间范围内暂无直接/未归因访问"
            />
          ),
        }}
        pagination={false}
        size="small"
      />
    </Card>
  );
}
