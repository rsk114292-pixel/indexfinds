'use client';

import { useState, useEffect } from 'react';
import { Tabs, Card } from 'antd';
import { UploadOutlined, HistoryOutlined } from '@ant-design/icons';
import { UrlInputForm } from './components/UrlInputForm';
import { ImportProgress } from './components/ImportProgress';
import { ImportHistory } from './components/ImportHistory';
import type { BatchJob } from '@/types';

const ACTIVE_JOB_KEY = 'batch-import-active-job';

function saveActiveJob(job: BatchJob) {
  try {
    localStorage.setItem(ACTIVE_JOB_KEY, JSON.stringify({ id: job.id, totalItems: job.totalItems }));
  } catch { /* ignore */ }
}

function loadActiveJob(): Pick<BatchJob, 'id' | 'totalItems'> | null {
  try {
    const raw = localStorage.getItem(ACTIVE_JOB_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.id) return data;
  } catch { /* ignore */ }
  return null;
}

function clearActiveJob() {
  try {
    localStorage.removeItem(ACTIVE_JOB_KEY);
  } catch { /* ignore */ }
}

export default function BatchImportPage() {
  const [activeTab, setActiveTab] = useState<string>('new');
  const [currentJob, setCurrentJob] = useState<BatchJob | null>(null);

  // 页面加载时恢复未完成的 job
  useEffect(() => {
    const saved = loadActiveJob();
    if (saved) {
      setCurrentJob(saved as BatchJob);
    }
  }, []);

  const handleJobCreated = (job: BatchJob) => {
    setCurrentJob(job);
    saveActiveJob(job);
  };

  const handleJobCompleted = () => {
    setCurrentJob(null);
    clearActiveJob();
    setActiveTab('history');
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">批量导入</h1>
        <p className="text-gray-500 mt-1">从微店批量导入商品</p>
      </div>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'new',
              label: (
                <span>
                  <UploadOutlined />
                  新建导入
                </span>
              ),
              children: (
                <div className="space-y-4">
                  <UrlInputForm onJobCreated={handleJobCreated} />
                  {currentJob && (
                    <ImportProgress
                      jobId={currentJob.id}
                      onComplete={handleJobCompleted}
                    />
                  )}
                </div>
              ),
            },
            {
              key: 'history',
              label: (
                <span>
                  <HistoryOutlined />
                  导入历史
                </span>
              ),
              children: <ImportHistory />,
            },
          ]}
        />
      </Card>
    </div>
  );
}
