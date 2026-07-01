'use client';

import { Card } from 'antd';
import PieChart from '@/components/charts/PieChart';

interface ChannelBreakdown {
  channel: string;
  count: number;
  percentage: number;
}

const channelLabels: Record<string, string> = {
  organic_search: '自然搜索',
  paid_search: '付费搜索',
  social_organic: '社交媒体',
  social_paid: '付费社交',
  referral: '外部引荐',
  owned_referral: '自有站导流',
  internal: '站内回流',
  direct: '直接/未归因访问',
  email: '邮件营销',
  affiliate: '联盟营销',
  other: '其他',
};

export default function ChannelPieChart({ data }: { data: ChannelBreakdown[] }) {
  const chartData = data.map((item) => ({
    name: channelLabels[item.channel] || item.channel,
    value: item.count,
  }));

  return (
    <Card title="渠道分布（去重访问）">
      {data.length > 0 ? (
        <PieChart data={chartData} height={240} />
      ) : (
        <div className="text-center text-gray-400 py-8">暂无数据</div>
      )}
    </Card>
  );
}
