import { Card, Image, Tag, Table, Select, Alert } from 'antd';
import type { ImageGroup, MergedGroup, GroupMode, SkuGroupMapping } from './split-tool-types';

interface SKUMappingTableProps {
  imageGroups: ImageGroup[];
  skuCount: number;
  displayGroups: MergedGroup[];
  groupMode: GroupMode;
  mappings: SkuGroupMapping[];
  onImageGroupChange: (imageUrl: string, groupKey: string) => void;
}

export function SKUMappingTable({
  imageGroups,
  skuCount,
  displayGroups,
  groupMode,
  mappings,
  onImageGroupChange,
}: SKUMappingTableProps) {
  const columns = [
    {
      title: '图片',
      dataIndex: 'imageUrl',
      key: 'image',
      width: 80,
      render: (imageUrl: string) =>
        imageUrl && imageUrl !== 'no-image' ? (
          <Image src={imageUrl} alt="SKU image" width={60} height={60} className="object-cover rounded" />
        ) : (
          <div className="w-[60px] h-[60px] bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">
            N/A
          </div>
        ),
    },
    {
      title: '颜色/款式',
      dataIndex: 'colorAttr',
      key: 'colorAttr',
      render: (colorAttr: string) => (
        <div className="text-sm font-medium">{colorAttr}</div>
      ),
    },
    {
      title: '尺码',
      dataIndex: 'sizeCount',
      key: 'sizeCount',
      width: 80,
      render: (count: number) => (
        <Tag color="blue">{count} 个尺码</Tag>
      ),
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      render: (price: number) => (price ? `¥${price}` : '-'),
    },
    {
      title: '分配到分组',
      key: 'group',
      width: 280,
      render: (_: unknown, record: ImageGroup) => {
        const firstSkuId = record.skuIds[0];
        const currentMapping = mappings.find((m) => m.skuId === firstSkuId);
        return (
          <Select
            value={currentMapping?.groupKey}
            onChange={(value) => onImageGroupChange(record.imageUrl, value)}
            className="w-full"
            options={displayGroups.map((g) => ({
              value: g.groupKey,
              label:
                groupMode === 'byBrand'
                  ? `${g.brand} (${g.mergedFrom?.length || 1} 个款式)`
                  : `${g.brand} - ${g.model}`,
            }))}
          />
        );
      },
    },
  ];

  return (
    <Card title={`SKU 分组映射 (${imageGroups.length} 个颜色/款式变体, 共 ${skuCount} 个 SKU)`}>
      <Alert
        type="info"
        message="按颜色/款式查看和调整 SKU 分配"
        description="SKU 按图片分组。每行代表一个颜色/款式变体及其所有尺码。更改分组分配将应用于该变体的所有尺码。"
        className="mb-4"
      />
      <Table
        dataSource={imageGroups}
        columns={columns}
        rowKey="imageUrl"
        pagination={false}
        size="small"
      />
    </Card>
  );
}
