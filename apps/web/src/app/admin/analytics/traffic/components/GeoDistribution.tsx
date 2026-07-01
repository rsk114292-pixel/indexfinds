'use client';

import { Card, Progress } from 'antd';

interface GeoBreakdown {
  country: string;
  count: number;
  percentage: number;
}

// 常见国家代码到名称映射
const countryNames: Record<string, string> = {
  US: '美国',
  CN: '中国',
  GB: '英国',
  DE: '德国',
  FR: '法国',
  JP: '日本',
  KR: '韩国',
  CA: '加拿大',
  AU: '澳大利亚',
  IT: '意大利',
  ES: '西班牙',
  BR: '巴西',
  RU: '俄罗斯',
  IN: '印度',
  NL: '荷兰',
  SE: '瑞典',
  SG: '新加坡',
  HK: '中国香港',
  TW: '中国台湾',
  Unknown: '未知',
};

const geoColors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];

export default function GeoDistribution({ data }: { data: GeoBreakdown[] }) {
  return (
    <Card title="地域分布">
      {data.length > 0 ? (
        <div className="space-y-3">
          {data.slice(0, 10).map((item, index) => (
            <div key={item.country}>
              <div className="flex justify-between mb-1">
                <span>{countryNames[item.country] || item.country}</span>
                <span className="text-gray-500">{item.count} ({item.percentage}%)</span>
              </div>
              <Progress
                percent={item.percentage}
                showInfo={false}
                strokeColor={geoColors[index % geoColors.length]}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-400 py-8">暂无数据</div>
      )}
    </Card>
  );
}
