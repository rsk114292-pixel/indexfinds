import { Button, Tag, Alert, Result } from 'antd';
import type { SplitResult } from './split-tool-types';

interface SplitResultViewProps {
  splitResult: SplitResult;
  onBackToMixed: () => void;
  onViewAllProducts: () => void;
}

export function SplitResultView({ splitResult, onBackToMixed, onViewAllProducts }: SplitResultViewProps) {
  return (
    <Result
      status="success"
      title="拆分完成！"
      subTitle={`成功创建了 ${splitResult.createdProducts.length} 个新产品`}
      extra={[
        <Button key="back" onClick={onBackToMixed}>
          返回混合产品
        </Button>,
        <Button key="products" type="primary" onClick={onViewAllProducts}>
          查看所有产品
        </Button>,
      ]}
    >
      <div className="mt-4">
        <h4 className="font-semibold mb-2">已创建的产品:</h4>
        <div className="space-y-2">
          {splitResult.createdProducts.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between bg-gray-50 p-2 rounded"
            >
              <span>{p.title}</span>
              <Tag color="green">{p.skuCount} SKUs</Tag>
            </div>
          ))}
        </div>
        {splitResult.warnings.length > 0 && (
          <Alert
            type="warning"
            className="mt-4"
            message="警告"
            description={
              <ul className="list-disc pl-4">
                {splitResult.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            }
          />
        )}
      </div>
    </Result>
  );
}
