import {
  Card,
  Tag,
  Space,
  Radio,
  Dropdown,
  Tooltip,
  Button,
  Alert,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  MergeCellsOutlined,
  UndoOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { MergedGroup, GroupMode, SkuGroupMapping } from './split-tool-types';

interface GroupsPanelProps {
  displayGroups: MergedGroup[];
  groupMode: GroupMode;
  mappings: SkuGroupMapping[];
  hasChanges: boolean;
  onGroupModeChange: (mode: GroupMode) => void;
  onMergeGroup: (sourceGroupKey: string, targetGroupKey: string) => void;
  onDeleteGroup: (groupKey: string, isCustom?: boolean) => void;
  onResetMerges: () => void;
  onOpenNewGroupModal: () => void;
}

export function GroupsPanel({
  displayGroups,
  groupMode,
  mappings,
  hasChanges,
  onGroupModeChange,
  onMergeGroup,
  onDeleteGroup,
  onResetMerges,
  onOpenNewGroupModal,
}: GroupsPanelProps) {
  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <span>建议产品分组</span>
          <Space>
            <Radio.Group
              value={groupMode}
              onChange={(e) => onGroupModeChange(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              size="small"
            >
              <Radio.Button value="byModel">按款式</Radio.Button>
              <Radio.Button value="byBrand">按品牌</Radio.Button>
            </Radio.Group>
            <Tooltip title="创建新的自定义分组">
              <Button
                size="small"
                type="dashed"
                icon={<PlusOutlined />}
                onClick={onOpenNewGroupModal}
              >
                新建分组
              </Button>
            </Tooltip>
            {hasChanges && (
              <Tooltip title="重置所有更改（合并、自定义分组、删除）">
                <Button
                  size="small"
                  icon={<UndoOutlined />}
                  onClick={onResetMerges}
                >
                  重置全部
                </Button>
              </Tooltip>
            )}
          </Space>
        </div>
      }
    >
      {groupMode === 'byBrand' && (
        <Alert
          type="info"
          message="品牌模式"
          description="分组按品牌合并。同一品牌的所有款式将合并为一个产品。"
          className="mb-4"
          showIcon
        />
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayGroups.map((group) => {
          const groupSkuCount = mappings.filter(
            (m) => m.groupKey === group.groupKey
          ).length;

          const mergeMenuItems: MenuProps['items'] = displayGroups
            .filter((g) => g.groupKey !== group.groupKey)
            .map((g) => ({
              key: g.groupKey,
              label: `${g.brand}${groupMode === 'byModel' ? ` - ${g.model}` : ''}`,
              onClick: () => onMergeGroup(group.groupKey, g.groupKey),
            }));

          return (
            <Card
              key={group.groupKey}
              size="small"
              title={
                <div className="flex items-center gap-2">
                  <Tag color="blue">{group.brand}</Tag>
                  <span className="truncate">
                    {groupMode === 'byBrand' ? '' : group.model}
                  </span>
                  {group.isCustom && (
                    <Tag color="green" className="text-xs">自定义</Tag>
                  )}
                </div>
              }
              extra={
                <Space size={0}>
                  {groupMode === 'byModel' && displayGroups.length > 1 && (
                    <Dropdown menu={{ items: mergeMenuItems }} trigger={['click']}>
                      <Tooltip title="合并到其他分组">
                        <Button
                          type="text"
                          size="small"
                          icon={<MergeCellsOutlined />}
                        />
                      </Tooltip>
                    </Dropdown>
                  )}
                  {displayGroups.length > 1 && (
                    <Tooltip title="删除此分组">
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => onDeleteGroup(group.groupKey, group.isCustom)}
                      />
                    </Tooltip>
                  )}
                </Space>
              }
            >
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">建议标题:</span>
                  <div className="truncate">{group.suggestedTitle}</div>
                </div>
                {group.mergedFrom && group.mergedFrom.length > 1 && (
                  <div>
                    <span className="text-gray-500">包含:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {group.mergedFrom.slice(0, 3).map((m, i) => (
                        <Tag key={i} color="default" className="text-xs">
                          {m}
                        </Tag>
                      ))}
                      {group.mergedFrom.length > 3 && (
                        <Tag color="default" className="text-xs">
                          +{group.mergedFrom.length - 3} 更多
                        </Tag>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">SKU 数:</span>
                  <Tag color={groupSkuCount > 0 ? 'green' : 'red'}>
                    {groupSkuCount}
                  </Tag>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">图片数:</span>
                  <span>{group.imageIndexes.length}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
}
