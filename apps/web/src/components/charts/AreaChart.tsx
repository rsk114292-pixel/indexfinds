'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Tooltip } from 'antd';

interface DataPoint {
  period: string;
  count: number;
}

interface AreaChartProps {
  data: DataPoint[];
  height?: number;
  color?: string;
}

const CHART_PADDING = { top: 20, right: 20, bottom: 30, left: 50 };

function formatXAxisLabel(period: string) {
  const value = period.trim();

  const dayMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dayMatch) {
    return `${dayMatch[2]}-${dayMatch[3]}`;
  }

  const dateTimeMatch = value.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::\d{2})?/);
  if (dateTimeMatch) {
    return dateTimeMatch[2];
  }

  const hourMatch = value.match(/^(\d{2}:\d{2})(?::\d{2})?$/);
  if (hourMatch) {
    return hourMatch[1];
  }

  if (value.length > 10) {
    return value.slice(-5);
  }

  return value;
}

export default function AreaChart({ data, height = 300, color = '#1890ff' }: AreaChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const width = Math.max(containerWidth || 800, 360);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateWidth = () => {
      setContainerWidth(node.clientWidth);
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  const maxCount = useMemo(() => Math.max(...data.map((d) => d.count), 1), [data]);

  const chartWidth = width - CHART_PADDING.left - CHART_PADDING.right;
  const chartHeight = height - CHART_PADDING.top - 42;
  const xAxisY = height - 12;
  const formattedLabels = useMemo(() => data.map((item) => formatXAxisLabel(item.period)), [data]);
  const estimatedLabelWidth = useMemo(() => {
    const longest = formattedLabels.reduce((max, label) => Math.max(max, label.length), 0);
    return Math.min(Math.max(longest * 7, 44), 76);
  }, [formattedLabels]);
  const maxVisibleLabels = useMemo(
    () => Math.max(2, Math.floor(chartWidth / estimatedLabelWidth)),
    [chartWidth, estimatedLabelWidth],
  );
  const labelStep = useMemo(
    () => Math.max(1, Math.ceil(Math.max(data.length, 1) / maxVisibleLabels)),
    [data.length, maxVisibleLabels],
  );

  // 生成坐标点
  const points = useMemo(() => {
    if (data.length === 0) return [];
    const stepX = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth / 2;
    return data.map((d, i) => ({
      x: CHART_PADDING.left + (data.length > 1 ? i * stepX : stepX),
      y: CHART_PADDING.top + chartHeight - (d.count / maxCount) * chartHeight,
      ...d,
    }));
  }, [data, chartWidth, chartHeight, maxCount]);

  // 折线路径
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [points]);

  // 面积路径
  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const baseline = CHART_PADDING.top + chartHeight;
    return `${linePath} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`;
  }, [linePath, points, chartHeight]);

  // Y 轴刻度
  const yTicks = useMemo(() => {
    const tickCount = 5;
    return Array.from({ length: tickCount }, (_, i) => {
      const value = Math.round((maxCount / (tickCount - 1)) * i);
      const y = CHART_PADDING.top + chartHeight - (value / maxCount) * chartHeight;
      return { value, y };
    });
  }, [maxCount, chartHeight]);

  const visibleLabelIndices = useMemo(() => {
    if (points.length === 0) return [];

    const indices: number[] = [];
    for (let i = 0; i < points.length; i += labelStep) {
      indices.push(i);
    }

    const lastIndex = points.length - 1;
    const previousIndex = indices[indices.length - 1];
    if (previousIndex !== lastIndex) {
      if (lastIndex - previousIndex < Math.ceil(labelStep / 2)) {
        indices[indices.length - 1] = lastIndex;
      } else {
        indices.push(lastIndex);
      }
    }

    return indices;
  }, [points.length, labelStep]);

  if (data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-gray-400">
        暂无数据
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ height }} className="w-full">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {/* Y 轴网格线 + 刻度 */}
        {yTicks.map((tick, i) => (
          <g key={`y-${i}`}>
            <line
              x1={CHART_PADDING.left}
              y1={tick.y}
              x2={width - CHART_PADDING.right}
              y2={tick.y}
              stroke="#f0f0f0"
              strokeDasharray="4 2"
            />
            <text x={CHART_PADDING.left - 8} y={tick.y + 4} textAnchor="end" fontSize="11" fill="#999">
              {tick.value}
            </text>
          </g>
        ))}

        {/* 面积 */}
        <path d={areaPath} fill={color} opacity={0.1} />

        {/* 折线 */}
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" />

        {/* 数据点 */}
        {points.map((p, i) => (
          <g key={`pt-${i}`}>
            <Tooltip
              title={
                <div>
                  <div>{p.period}</div>
                  <div>访问量: {p.count}</div>
                </div>
              }
            >
              <circle cx={p.x} cy={p.y} r="4" fill={color} stroke="#fff" strokeWidth="2" className="cursor-pointer" />
            </Tooltip>
          </g>
        ))}

        {/* X 轴标签（按容器宽度自适应显示密度） */}
        {visibleLabelIndices.map((index) => {
          const point = points[index];
          return (
            <text
              key={`xl-${index}`}
              x={point.x}
              y={xAxisY}
              textAnchor="middle"
              fontSize="11"
              fill="#999"
            >
              {formattedLabels[index]}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
