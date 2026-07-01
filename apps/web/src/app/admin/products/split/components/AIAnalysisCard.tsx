import { Card, Tag, Alert } from 'antd';
import type { SplitPreview } from './split-tool-types';

interface AIAnalysisCardProps {
  overview: SplitPreview['aiAnalysis']['overview'];
  aiConfidence: number;
  groupCount: number;
}

export function AIAnalysisCard({ overview, aiConfidence, groupCount }: AIAnalysisCardProps) {
  return (
    <Card title="AI 分析">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-500">
            {Math.round(overview.mixednessScore.overallScore * 100)}%
          </div>
          <div className="text-gray-500 text-sm">混合度分数</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-500">
            {Math.round(aiConfidence * 100)}%
          </div>
          <div className="text-gray-500 text-sm">AI 置信度</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-500">
            {overview.detectedBrands.length}
          </div>
          <div className="text-gray-500 text-sm">检测到的品牌</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-500">
            {groupCount}
          </div>
          <div className="text-gray-500 text-sm">建议分组</div>
        </div>
      </div>

      {overview.splitReason && (
        <Alert
          type="info"
          message="拆分原因"
          description={overview.splitReason}
          className="mb-4"
        />
      )}

      <div className="flex flex-wrap gap-2">
        <span className="text-gray-500">检测到的品牌:</span>
        {overview.detectedBrands.map((brand) => (
          <Tag key={brand} color="blue">
            {brand}
          </Tag>
        ))}
      </div>
    </Card>
  );
}
