'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Plus, FolderPlus } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { get, post, del } from '@/lib/api';
import type { CollectionTab } from './CollectionTabs';

interface AddToCollectionSheetProps {
  open: boolean;
  onClose: () => void;
  favoriteId: string;
  collections: CollectionTab[];
  onCollectionsChange: () => void;
  onCreateClick: () => void;
}

export default function AddToCollectionSheet({
  open,
  onClose,
  favoriteId,
  collections,
  onCollectionsChange,
  onCreateClick,
}: AddToCollectionSheetProps) {
  const t = useTranslations('account');
  const { isAuthenticated } = useAuthStore();
  const [memberOf, setMemberOf] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);

  // Reset memberOf when favoriteId changes
  useEffect(() => {
    setMemberOf(new Set());
  }, [favoriteId]);

  // Fetch which collections this favorite belongs to
  useEffect(() => {
    if (!open || !favoriteId || !isAuthenticated) return;
    const checkMembership = async () => {
      try {
        const data = await get<{ collectionIds: string[] }>(
          `/collections/membership/${favoriteId}`,
        );
        setMemberOf(new Set(data.collectionIds));
      } catch {
        // silent
      }
    };
    checkMembership();
  }, [open, favoriteId, isAuthenticated]);

  const handleToggle = async (collectionId: string) => {
    if (loading) return;
    setLoading(collectionId);
    try {
      const isMember = memberOf.has(collectionId);
      if (isMember) {
        await del(`/collections/${collectionId}/items/${favoriteId}`);
        setMemberOf((prev) => {
          const next = new Set(prev);
          next.delete(collectionId);
          return next;
        });
      } else {
        await post(`/collections/${collectionId}/items`, { favoriteIds: [favoriteId] });
        setMemberOf((prev) => new Set(prev).add(collectionId));
      }
      onCollectionsChange();
    } catch {
      // silent
    } finally {
      setLoading(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-background rounded-t-xl lg:rounded-xl shadow-xl w-full lg:max-w-sm max-h-[60vh] flex flex-col safe-bottom">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">
            {t('addToCollection')}
          </h3>
          <button
            type="button"
            onClick={onCreateClick}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('createCollection')}
          </button>
        </div>

        {/* Collection list */}
        <div className="flex-1 overflow-y-auto py-1">
          {collections.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted">
              <FolderPlus className="w-8 h-8 mb-2" />
              <p className="text-sm">{t('createCollection')}</p>
            </div>
          ) : (
            collections.map((col) => {
              const isMember = memberOf.has(col.id);
              const isLoading = loading === col.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => handleToggle(col.id)}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/10 transition-colors disabled:opacity-50"
                >
                  <span className="text-sm text-foreground">{col.name}</span>
                  {isMember && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Close button (mobile) */}
        <div className="px-4 py-3 border-t border-border lg:hidden">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-lg bg-muted/10 text-sm text-foreground hover:bg-muted/20 transition-colors"
          >
            {t('done')}
          </button>
        </div>
      </div>
    </div>
  );
}
