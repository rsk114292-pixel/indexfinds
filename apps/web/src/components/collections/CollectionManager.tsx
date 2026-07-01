'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, Trash2 } from 'lucide-react';
import type { CollectionTab } from './CollectionTabs';

interface CollectionManagerProps {
  mode: 'create' | 'manage';
  collection?: CollectionTab; // required when mode = 'manage'
  open: boolean;
  onClose: () => void;
  onCreate?: (name: string) => Promise<void>;
  onRename?: (id: string, name: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export default function CollectionManager({
  mode,
  collection,
  open,
  onClose,
  onCreate,
  onRename,
  onDelete,
}: CollectionManagerProps) {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const [name, setName] = useState(
    mode === 'manage' ? collection?.name ?? '' : '',
  );
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    try {
      if (mode === 'create' && onCreate) {
        await onCreate(trimmed);
      } else if (mode === 'manage' && onRename && collection) {
        await onRename(collection.id, trimmed);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!collection || !onDelete) return;
    setLoading(true);
    try {
      await onDelete(collection.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-background rounded-xl shadow-xl w-[90vw] max-w-sm p-5 mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">
            {mode === 'create'
              ? t('createCollection')
              : t('manageCollection')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-muted/20 text-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Name input */}
        {!showDeleteConfirm && (
          <div className="space-y-3">
            <label className="block text-sm text-muted">
              {t('collectionName')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('collectionNamePlaceholder')}
              maxLength={50}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
              autoFocus
            />
            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!name.trim() || loading}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
              >
                {mode === 'create'
                  ? t('createCollection')
                  : t('renameCollection')}
              </button>

              {mode === 'manage' && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                  title={t('deleteCollection')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Delete confirmation */}
        {showDeleteConfirm && collection && (
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              {t('deleteCollectionConfirm', { name: collection.name })}
            </p>
            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted/10 transition-colors"
              >
                {tc('cancel')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium disabled:opacity-50 hover:bg-red-600 transition-colors"
              >
                {t('deleteCollection')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
