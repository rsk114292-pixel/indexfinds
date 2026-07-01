'use client';

import { useTranslations } from 'next-intl';

import SecuritySessions from '@/components/account/SecuritySessions';
import SecurityLinkedAccounts from '@/components/account/SecurityLinkedAccounts';
import SecurityPassword from '@/components/account/SecurityPassword';

/**
 * 移动端账号安全/设置页
 *
 * 规格（Plan 3.7）：
 * - 复用现有 SecuritySessions / SecurityLinkedAccounts / SecurityPassword 组件
 * - 移动端优化间距和标题展示
 * - 全宽卡片式布局
 */
export default function MobileSettings() {
  const t = useTranslations('account');

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* 标题 */}
      <div className="bg-surface px-4 pt-3 pb-3">
        <h1 className="text-lg font-bold text-foreground">
          {t('securitySettings')}
        </h1>
        <p className="text-xs text-muted mt-0.5">
          {t('securitySettingsDesc')}
        </p>
      </div>

      {/* 会话管理 */}
      <div className="bg-surface mt-2 px-4 py-4">
        <SecuritySessions />
      </div>

      {/* 关联账户 */}
      <div className="bg-surface mt-2 px-4 py-4">
        <SecurityLinkedAccounts />
      </div>

      {/* 修改密码 */}
      <div className="bg-surface mt-2 px-4 py-4">
        <SecurityPassword />
      </div>

      {/* 底部空白 */}
      <div className="h-8" />
    </div>
  );
}
