'use client';

import { useMemo } from 'react';

interface DataPoint {
  name: string;
  value: number;
}

interface PieChartProps {
  data: DataPoint[];
  title?: string;
  height?: number;
}

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'];

export default function PieChart({ data, title, height = 200 }: PieChartProps) {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

  // 计算每个扇形的角度
  const segments = useMemo(() => {
    let currentAngle = 0;
    return data.map((item, index) => {
      const percent = total > 0 ? item.value / total : 0;
      const angle = percent * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      return {
        ...item,
        percent,
        startAngle,
        endAngle: currentAngle,
        color: COLORS[index % COLORS.length],
      };
    });
  }, [data, total]);

  // 生成SVG路径
  const createArcPath = (startAngle: number, endAngle: number, radius: number) => {
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = 100 + radius * Math.cos(startRad);
    const y1 = 100 + radius * Math.sin(startRad);
    const x2 = 100 + radius * Math.cos(endRad);
    const y2 = 100 + radius * Math.sin(endRad);

    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return `M 100 100 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  if (total === 0) {
    return (
      <div style={{ height }} className="flex flex-col items-center justify-center">
        {title && <h4 className="text-lg font-medium mb-4">{title}</h4>}
        <div className="text-gray-400">No data</div>
      </div>
    );
  }

  return (
    <div style={{ height }} className="flex items-center gap-6">
      {/* 饼图 */}
      <div className="flex-shrink-0">
        <svg width="160" height="160" viewBox="0 0 200 200">
          {segments.map((segment, index) => {
            if (segment.value <= 0) return null;
            // 360° 满圆时 SVG arc 起终点重合导致路径退化，改用 circle
            if (segment.endAngle - segment.startAngle >= 359.99) {
              return <circle key={index} cx="100" cy="100" r="80" fill={segment.color} stroke="#fff" strokeWidth="2" />;
            }
            return (
              <path
                key={index}
                d={createArcPath(segment.startAngle, segment.endAngle, 80)}
                fill={segment.color}
                stroke="#fff"
                strokeWidth="2"
              />
            );
          })}
          {/* 中心圆（环形图效果） */}
          <circle cx="100" cy="100" r="40" fill="white" />
          <text x="100" y="95" textAnchor="middle" dominantBaseline="middle" fontSize="20" fontWeight="bold" fill="#374151">
            {total}
          </text>
          <text x="100" y="115" textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="#9ca3af">
            Total
          </text>
        </svg>
      </div>

      {/* 图例 */}
      <div className="flex-1 space-y-2">
        {segments.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-gray-600 truncate flex-1">{item.name}</span>
            <span className="text-sm font-medium text-gray-800">{item.value}</span>
            <span className="text-xs text-gray-400 w-12 text-right">
              {Math.round(item.percent * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
