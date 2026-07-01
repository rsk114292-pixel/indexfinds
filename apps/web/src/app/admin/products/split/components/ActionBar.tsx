import { Card, Button, Space } from 'antd';
import { ScissorOutlined } from '@ant-design/icons';
import type { GroupMode } from './split-tool-types';

interface ActionBarProps {
  displayGroupCount: number;
  originalGroupCount: number;
  customGroupCount: number;
  deletedGroupCount: number;
  groupMode: GroupMode;
  splitting: boolean;
  onCancel: () => void;
  onExecuteSplit: () => void;
}

export function ActionBar({
  displayGroupCount,
  originalGroupCount,
  customGroupCount,
  deletedGroupCount,
  groupMode,
  splitting,
  onCancel,
  onExecuteSplit,
}: ActionBarProps) {
  return (
    <Card>
      <div className="flex justify-between items-center">
        <div className="text-gray-500">
          准备拆分为{' '}
          <span className="font-semibold text-blue-600">
            {displayGroupCount}
          </span>{' '}
          个产品
          {groupMode === 'byBrand' && (
            <span className="ml-2 text-xs">
              (从 {originalGroupCount} 个原始分组合并)
            </span>
          )}
          {customGroupCount > 0 && (
            <span className="ml-2 text-xs text-green-600">
              (+{customGroupCount} 个自定义)
            </span>
          )}
          {deletedGroupCount > 0 && (
            <span className="ml-2 text-xs text-red-500">
              (-{deletedGroupCount} 个已删除)
            </span>
          )}
        </div>
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button
            type="primary"
            icon={<ScissorOutlined />}
            loading={splitting}
            onClick={onExecuteSplit}
          >
            执行拆分
          </Button>
        </Space>
      </div>
    </Card>
  );
}
