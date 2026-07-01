'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { App } from 'antd';
import { Lock, CheckCircle, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { changePassword } from '@/lib/auth-api';

export default function SecurityPassword() {
  const t = useTranslations('security');
  const tc = useTranslations('common');
  const { message: messageApi } = App.useApp();

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const passwordChecks = [
    { ok: newPassword.length >= 8 && newPassword.length <= 32, label: t('rule8to32') },
    { ok: /[a-z]/.test(newPassword), label: t('ruleLowercase') },
    { ok: /[A-Z]/.test(newPassword), label: t('ruleUppercase') },
    { ok: /\d/.test(newPassword), label: t('ruleNumber') },
    { ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword), label: t('ruleSpecialChar') },
  ];
  const passwordValid = passwordChecks.every((c) => c.ok);

  const resetForm = () => {
    setShowForm(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      messageApi.error(t('passwordsDoNotMatch'));
      return;
    }
    setLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      messageApi.success(t('passwordChangedSuccess'));
      resetForm();
    } catch (error: unknown) {
      messageApi.error(error instanceof Error ? error.message : t('failedToChangePassword'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card padding="none">
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <Lock className="w-4 h-4 text-muted" />
        <span className="font-medium text-foreground">{t('password')}</span>
      </div>

      <div className="p-4">
        {!showForm ? (
          <Button onClick={() => setShowForm(true)}>
            {t('changePassword')}
          </Button>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('currentPassword')}
              </label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('newPassword')}
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              {newPassword && (
                <div className="mt-2 space-y-0.5">
                  {passwordChecks.map((r) => (
                    <div key={r.label} className="flex items-center gap-1.5 text-xs">
                      {r.ok ? (
                        <CheckCircle className="w-3 h-3 text-success shrink-0" />
                      ) : (
                        <XCircle className="w-3 h-3 text-border shrink-0" />
                      )}
                      <span className={r.ok ? 'text-success' : 'text-muted'}>
                        {r.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('confirmNewPassword')}
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                error={
                  confirmPassword && confirmPassword !== newPassword
                    ? t('passwordsDoNotMatch')
                    : undefined
                }
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                loading={loading}
                disabled={!passwordValid || !currentPassword}
              >
                {t('updatePassword')}
              </Button>
              <Button variant="secondary" onClick={resetForm}>
                {tc('cancel')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}
