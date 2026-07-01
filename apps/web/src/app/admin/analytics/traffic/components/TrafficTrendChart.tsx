'use client';

import { Card, Select } from 'antd';
import AreaChart from '@/components/charts/AreaChart';

interface TrafficTrend {
  period: string;
  count: number;
}

interface TrafficTrendChartProps {
  data: TrafficTrend[];
  groupBy: 'day' | 'hour';
  onGroupByChange: (value: 'day' | 'hour') => void;
}

export default function TrafficTrendChart({ data, groupBy, onGroupByChange }: TrafficTrendChartProps) {
  return (
    <Card
      title="去重访问趋势"
      extra={
        <Select
          value={groupBy}
          onChange={onGroupByChange}
          size="small"
          style={{ width: 100 }}
          options={[
            { value: 'day', label: '按天' },
            { value: 'hour', label: '按小时' },
          ]}
        />
      }
    >
      <AreaChart data={data} height={300} />
    </Card>
  );
}
