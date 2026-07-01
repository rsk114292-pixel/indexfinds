import { Card, Tag } from 'antd';
import { UndoOutlined } from '@ant-design/icons';
import type { SuggestedGroup } from './split-tool-types';

interface DeletedGroupsBarProps {
  deletedGroupKeys: Set<string>;
  originalGroups: SuggestedGroup[];
  onRestoreGroup: (groupKey: string) => void;
}

export function DeletedGroupsBar({
  deletedGroupKeys,
  originalGroups,
  onRestoreGroup,
}: DeletedGroupsBarProps) {
  if (deletedGroupKeys.size === 0) return null;

  return (
    <Card size="small" className="bg-gray-50">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-gray-500 text-sm">已删除的分组:</span>
        {Array.from(deletedGroupKeys).map((groupKey) => {
          const originalGroup = originalGroups.find((g) => g.groupKey === groupKey);
          return (
            <Tag
              key={groupKey}
              closable
              onClose={(e) => {
                e.preventDefault();
                onRestoreGroup(groupKey);
              }}
              closeIcon={<UndoOutlined />}
              color="default"
              className="opacity-60"
            >
              {originalGroup ? `${originalGroup.brand} - ${originalGroup.model}` : groupKey}
            </Tag>
          );
        })}
      </div>
    </Card>
  );
}
