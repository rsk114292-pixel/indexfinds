'use client';

import { Card, Table, Tag } from 'antd';
import { BugOutlined } from '@ant-design/icons';
import { EmptyState } from '../../../components/EmptyState';

interface CaptureLossBreakdown {
  reason: string;
  count: number;
  percentage: number;
}

const reasonLabels: Record<string, string> = {
  captured: '已捕获',
  consent_rejected: '用户拒绝统计同意',
  consent_pending: '未同意 / 尚未选择统计同意',
  ga_blocked: 'GA 脚本被拦截',
  ga_failed: 'GA 初始化失败',
  ga_disabled: 'GA 配置关闭或不可用',
  ga_loading: 'GA 仍在加载',
  ready_but_no_pageview: 'GA 已就绪但未观察到首次页面浏览',
  unclassified: '未分类',
};

const failureReasonLabels: Record<string, string> = {
  script_load_timeout: '脚本加载超时',
  missing_tracking_config: '缺少追踪配置',
  invalid_tracking_id: '追踪 ID 无效',
  tracking_disabled: '追踪已关闭',
  consent_rejected: '用户拒绝统计同意',
};

function formatReason(reason: string): string {
  if (reason.startsWith('ga_failed:')) {
    const failureReason = reason.slice('ga_failed:'.length);
    return `GA 初始化失败: ${
      failureReasonLabels[failureReason] || failureReason
    }`;
  }

  return reasonLabels[reason] || reason;
}

const columns = [
  {
    title: '原因',
    dataIndex: 'reason',
    key: 'reason',
    render: (reason: string) => <span className="font-medium">{formatReason(reason)}</span>,
  },
  {
    title: '记录数',
    dataIndex: 'count',
    key: 'count',
    sorter: (a: CaptureLossBreakdown, b: CaptureLossBreakdown) =>
      a.count - b.count,
  },
  {
    title: '占比',
    dataIndex: 'percentage',
    key: 'percentage',
    sorter: (a: CaptureLossBreakdown, b: CaptureLossBreakdown) =>
      a.percentage - b.percentage,
    render: (value: number) => {
      const color = value >= 30 ? 'red' : value >= 10 ? 'orange' : 'blue';
      return <Tag color={color}>{value}%</Tag>;
    },
  },
];

export default function CaptureLossTable({
  data,
}: {
  data: CaptureLossBreakdown[];
}) {
  return (
    <Card title="去重首方访问状态拆解">
      <Table
        dataSource={data}
        columns={columns}
        rowKey="reason"
        locale={{
          emptyText: (
            <EmptyState
              icon={<BugOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
              title="暂无诊断数据"
              description="等待首方访问记录回写 consent 和 GA 诊断信息"
            />
          ),
        }}
        pagination={false}
        size="small"
      />
    </Card>
  );
}
