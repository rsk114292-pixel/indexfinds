'use client';

import { SplitHistoryList } from './components/SplitHistoryList';

export default function SplitHistoryPage() {
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">拆分历史</h1>
        <p className="text-gray-500 mt-1">
          查看所有产品拆分操作，必要时可回滚
        </p>
      </div>
      <SplitHistoryList />
    </div>
  );
}
