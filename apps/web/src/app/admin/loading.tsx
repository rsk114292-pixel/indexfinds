/**
 * Admin Loading State
 * Shows a spinner while admin pages load.
 */
import { Spin } from 'antd';

export default function AdminLoading() {
  return (
    <div className="flex items-center justify-center min-h-[280px]">
      <Spin size="large" />
    </div>
  );
}
