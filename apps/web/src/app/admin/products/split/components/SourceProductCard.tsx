import { Card, Image, Descriptions } from 'antd';
import type { MixedProductDetail, SplitPreview } from './split-tool-types';

interface SourceProductCardProps {
  product: MixedProductDetail['product'];
  sourceProduct: SplitPreview['sourceProduct'];
}

export function SourceProductCard({ product, sourceProduct }: SourceProductCardProps) {
  return (
    <Card title="源产品">
      <div className="flex gap-6">
        {product.mainImage && (
          <Image
            src={product.mainImage}
            alt={product.title || 'Product image'}
            width={200}
            height={200}
            className="object-cover rounded"
          />
        )}
        <div className="flex-1">
          <Descriptions column={1} size="small">
            <Descriptions.Item label="标题">{product.title}</Descriptions.Item>
            <Descriptions.Item label="原始标题">
              {product.originalTitle || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="SKU 数量">
              {sourceProduct.skuCount}
            </Descriptions.Item>
            <Descriptions.Item label="图片">
              {product.images?.length || 0}
            </Descriptions.Item>
            <Descriptions.Item label="来源链接">
              {product.sourceUrl ? (
                <a href={product.sourceUrl} target="_blank" rel="noopener noreferrer">
                  在微店查看
                </a>
              ) : (
                '-'
              )}
            </Descriptions.Item>
          </Descriptions>
        </div>
      </div>
    </Card>
  );
}
