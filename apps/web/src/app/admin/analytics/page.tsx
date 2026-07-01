import { redirect } from 'next/navigation';

/**
 * 数据分析概览 — 已合并到 Dashboard
 * 点击"数据分析"组头时重定向到搜索分析页
 */
export default function AnalyticsOverviewPage() {
  redirect('/admin/analytics/search');
}
