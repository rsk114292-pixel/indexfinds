'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { App } from 'antd';
import { Monitor, LogOut, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { Spinner } from '@/components/ui/Spinner';
import { Empty } from '@/components/ui/Empty';
import { useAuthStore } from '@/stores/useAuthStore';
import { getSessions, revokeSession, logoutAll } from '@/lib/auth-api';

interface Session {
  id: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
}

function parseDeviceInfo(userAgent: string | null, t: (key: string) => string): string {
  if (!userAgent) return t('unknownDevice');
  if (userAgent.includes('Chrome')) return t('chromeBrowser');
  if (userAgent.includes('Firefox')) return t('firefoxBrowser');
  if (userAgent.includes('Safari')) return t('safariBrowser');
  if (userAgent.includes('Edge')) return t('edgeBrowser');
  if (userAgent.length > 50) return userAgent.substring(0, 50) + '...';
  return userAgent;
}

export default function SecuritySessions() {
  const t = useTranslations('security');
  const router = useRouter();
  const { token, _hasHydrated, logout: storeLogout } = useAuthStore();
  const { message: messageApi, modal } = App.useApp();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSessions();
      setSessions(data);
    } catch {
      messageApi.error(t('failedToLoadSessions'));
    } finally {
      setLoading(false);
    }
  }, [messageApi, t]);

  useEffect(() => {
    if (_hasHydrated && token) fetchSessions();
  }, [_hasHydrated, token, fetchSessions]);

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      await revokeSession(sessionId);
      messageApi.success(t('sessionRevoked'));
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      messageApi.error(t('failedToRevokeSession'));
    } finally {
      setRevokingId(null);
    }
  };

  const handleLogoutAll = () => {
    modal.confirm({
      title: t('logoutAllConfirmTitle'),
      content: t('logoutAllConfirmContent'),
      okText: t('logoutAll'),
      okType: 'danger',
      onOk: async () => {
        try {
          await logoutAll();
          messageApi.success(t('loggedOutAll'));
          storeLogout();
          router.push('/login');
        } catch {
          messageApi.error(t('failedToLogoutAll'));
        }
      },
    });
  };

  return (
    <Card padding="none">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-muted" />
          <span className="font-medium text-foreground">{t('activeSessions')}</span>
        </div>
        {sessions.length > 1 && (
          <Button
            variant="danger"
            size="sm"
            icon={<LogOut className="w-4 h-4" />}
            onClick={handleLogoutAll}
          >
            {t('logoutAll')}
          </Button>
        )}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : sessions.length === 0 ? (
          <Empty title={t('noActiveSessions')} />
        ) : (
          <div className="divide-y divide-border">
            {sessions.map((session, index) => (
              <div
                key={session.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-foreground text-sm">
                    {parseDeviceInfo(session.deviceInfo, t)}
                  </p>
                  <p className="text-xs text-muted">
                    {t('ip', { ip: session.ipAddress || t('unknown') })}
                  </p>
                  <p className="text-xs text-muted">
                    {t('created', { date: new Date(session.createdAt).toLocaleString() })}
                  </p>
                </div>
                {index === 0 ? (
                  <Tag color="green" size="sm">{t('current')}</Tag>
                ) : (
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    loading={revokingId === session.id}
                    onClick={() => handleRevokeSession(session.id)}
                  >
                    {t('revoke')}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
