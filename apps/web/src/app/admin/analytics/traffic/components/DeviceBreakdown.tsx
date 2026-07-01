'use client';

import { Card } from 'antd';
import PieChart from '@/components/charts/PieChart';
import { formatDeviceTypeLabel } from './traffic-labels';

interface DeviceBreakdownData {
  deviceType: string;
  count: number;
  percentage: number;
}

export default function DeviceBreakdown({ data }: { data: DeviceBreakdownData[] }) {
  const chartData = data.map((item) => ({
    name: formatDeviceTypeLabel(item.deviceType),
    value: item.count,
  }));

  return (
    <Card title="设备分布">
      {data.length > 0 ? (
        <PieChart data={chartData} height={240} />
      ) : (
        <div className="text-center text-gray-400 py-8">暂无数据</div>
      )}
    </Card>
  );
}
