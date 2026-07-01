'use client';

import { Button, Card, Tag } from 'antd';

export interface TrafficExecutionTask {
  id: string;
  title: string;
  summary: string;
  metric: string;
  action: string;
  owner: string;
  priority: '高优先' | '中优先' | '观察';
  targetView: string;
  targetViewLabel: string;
}

function priorityColor(priority: TrafficExecutionTask['priority']): string {
  if (priority === '高优先') return 'red';
  if (priority === '中优先') return 'gold';
  return 'blue';
}

export default function ActionTaskBoard({
  tasks,
  onOpenView,
}: {
  tasks: TrafficExecutionTask[];
  onOpenView: (targetView: string) => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-gray-900">今日运营任务</h2>
        <p className="mt-1 text-sm text-gray-500">
          先处理最能改变高意向访客、激活用户和有效新用户结果的事项，再进入对应页面看证据和样本。
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {tasks.map((task) => (
          <Card key={task.id}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Tag color={priorityColor(task.priority)}>{task.priority}</Tag>
              <Tag>{task.owner}</Tag>
            </div>

            <div className="text-base font-semibold text-gray-900">{task.title}</div>
            <p className="mt-2 mb-0 text-sm leading-6 text-gray-600">{task.summary}</p>

            <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <div className="font-medium text-gray-900">关键指标</div>
              <div className="mt-1">{task.metric}</div>
            </div>

            <div className="mt-3 text-sm text-gray-700">
              <span className="font-medium text-gray-900">建议动作：</span>
              {task.action}
            </div>

            <div className="mt-4">
              <Button onClick={() => onOpenView(task.targetView)}>
                查看{task.targetViewLabel}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
