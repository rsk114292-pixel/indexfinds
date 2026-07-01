'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Heart, ArrowUpDown, FolderPlus } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { MobileProductCard } from '@/components/mobile/ui/MobileProductCard';
import { MobileProductGridSkeleton } from '@/components/mobile/ui/MobileSkeleton';
import { MobileBackToTop } from '@/components/mobile/ui/MobileBackToTop';
import MobilePullRefresh from '@/components/mobile/MobilePullRefresh';
import { MobileSheet } from '@/components/mobile/ui/MobileSheet';
import { Empty } from '@/components/ui/Empty';
import CollectionTabs, {
  type CollectionTab,
} from '@/components/collections/CollectionTabs';
import CollectionManager from '@/components/collections/CollectionManager';
import AddToCollectionSheet from '@/components/collections/AddToCollectionSheet';
import type { FavoriteItem, CollectionResponse, PaginationMeta } from '@/types';
import { get, post, patch, del } from '@/lib/api';

const MOBILE_PAGE_SIZE = 12;

type SortKey = 'createdAt_DESC' | 'priceMin_ASC' | 'priceMin_DESC';

const SORT_OPTIONS: { key: SortKey; tKey: string }[] = [
  { key: 'createdAt_DESC', tKey: 'sortByTime' },
  { key: 'priceMin_ASC', tKey: 'sortByPriceAsc' },
  { key: 'priceMin_DESC', tKey: 'sortByPriceDesc' },
];

export default function MobileFavorites() {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const { token } = useAuthStore();

  // Data
  const [products, setProducts] = useState<FavoriteItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Collections
  const [collections, setCollections] = useState<CollectionTab[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(
    null,
  );

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('createdAt_DESC');
  const [sortSheetOpen, setSortSheetOpen] = useState(false);

  // Manager dialog
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerMode, setManagerMode] = useState<'create' | 'manage'>(
    'create',
  );
  const [managingCollection, setManagingCollection] =
    useState<CollectionTab | undefined>();

  // Add-to-collection sheet
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addSheetFavoriteId, setAddSheetFavoriteId] = useState('');

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Load collections
  const loadCollections = useCallback(async () => {
    if (!token) return;
    try {
      const data = await get<CollectionResponse[]>('/collections');
      const arr = Array.isArray(data) ? data : [];
      setCollections(
        arr.map((c) => ({
          id: c.id,
          name: c.name,
          itemCount: c.itemCount ?? 0,
        })),
      );
    } catch {
      // silent
    }
  }, [token]);

  // Fetch one page
  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      if (!token) return;
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const [sort, order] = sortKey.split('_');
        const queryParams: Record<string, unknown> = {
          page: pageNum,
          limit: MOBILE_PAGE_SIZE,
          sort,
          order,
        };
        if (activeCollectionId) {
          queryParams.collectionId = activeCollectionId;
        }

        const data = await get<{ data: FavoriteItem[]; meta: PaginationMeta }>('/favorites', queryParams);
        const rawItems = Array.isArray(data?.data) ? data.data : [];
        const items: FavoriteItem[] = rawItems.map((item) => ({
          ...item,
          price: {
            min: parseFloat(String(item.priceMin)) || 0,
            max: parseFloat(String(item.priceMax)) || 0,
            currency: item.currency || 'CNY',
          },
        }));

        if (append) {
          setProducts((prev) => [...prev, ...items]);
        } else {
          setProducts(items);
        }

        const meta = data?.meta ?? {};
        setTotal(meta.total ?? 0);
        setHasMore(pageNum < (meta.totalPages ?? 1));
        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : t('failedToLoadFavorites'));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [token, sortKey, activeCollectionId, t],
  );

  // Initial load
  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  useEffect(() => {
    setPage(1);
    fetchPage(1, false);
  }, [fetchPage]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchPage(nextPage, true);
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page, fetchPage]);

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setPage(1);
    await fetchPage(1, false);
    await loadCollections();
  }, [fetchPage, loadCollections]);

  // Collection CRUD
  const handleCreateCollection = async (name: string) => {
    await post('/collections', { name });
    await loadCollections();
  };

  const handleRenameCollection = async (id: string, name: string) => {
    await patch(`/collections/${id}`, { name });
    await loadCollections();
  };

  const handleDeleteCollection = async (id: string) => {
    await del(`/collections/${id}`);
    if (activeCollectionId === id) setActiveCollectionId(null);
    await loadCollections();
  };

  return (
    <MobilePullRefresh onRefresh={handleRefresh}>
      <div className="min-h-dvh bg-background">
        {/* Header */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">
            {t('myFavorites')}
            {!loading && (
              <span className="ml-1 rtl:mr-1 rtl:ml-0 text-muted font-normal text-sm">
                ({total})
              </span>
            )}
          </h1>
          <button
            type="button"
            onClick={() => setSortSheetOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm text-muted active:bg-muted/10"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {t(SORT_OPTIONS.find((o) => o.key === sortKey)?.tKey ?? 'sortByTime')}
          </button>
        </div>

        {/* Collection tabs */}
        <div className="px-4 pb-3">
          <CollectionTabs
            collections={collections}
            activeId={activeCollectionId}
            onChange={(id) => setActiveCollectionId(id)}
            onCreateClick={() => {
              setManagerMode('create');
              setManagingCollection(undefined);
              setManagerOpen(true);
            }}
            onManageClick={(col) => {
              setManagerMode('manage');
              setManagingCollection(col);
              setManagerOpen(true);
            }}
          />
        </div>

        {/* Loading skeleton */}
        {loading && <MobileProductGridSkeleton count={6} />}

        {/* Error */}
        {error && !loading && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-red-500 mb-3">{error}</p>
            <button
              type="button"
              onClick={() => fetchPage(1, false)}
              className="text-sm text-primary active:opacity-70"
            >
              {tc('loadFailed')}
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && products.length === 0 && (
          <div className="px-4 py-16">
            <Empty
              icon={<Heart className="w-12 h-12" />}
              title={t('noFavoritesYet')}
              description={t('noFavoritesDesc')}
            />
          </div>
        )}

        {/* Product grid */}
        {products.length > 0 && (
          <div className="grid grid-cols-2 gap-3 px-4 pb-6">
            {products.map((product, index) => (
              <div key={product.id} className="relative">
                <MobileProductCard
                  product={product}
                  position={index + 1}
                />
                {collections.length > 0 && product.favoriteId && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setAddSheetFavoriteId(product.favoriteId!);
                      setAddSheetOpen(true);
                    }}
                    className="absolute top-2 left-2 rtl:right-2 rtl:left-auto z-10 w-7 h-7 rounded-full bg-white/90 shadow-sm flex items-center justify-center active:scale-95 transition-transform"
                    aria-label={t('addToCollection')}
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="h-1" />

        {/* Loading more */}
        {loadingMore && (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* No more */}
        {!loading && !hasMore && products.length > 0 && (
          <div className="flex items-center justify-center py-4">
            <p className="text-xs text-muted">{tc('noMore')}</p>
          </div>
        )}

        <MobileBackToTop />
      </div>

      {/* Sort sheet */}
      <MobileSheet
        open={sortSheetOpen}
        onClose={() => setSortSheetOpen(false)}
        title={t('sortByTime')}
        maxHeight="40vh"
      >
        <ul role="listbox" className="pb-2">
          {SORT_OPTIONS.map((opt) => {
            const isActive = sortKey === opt.key;
            return (
              <li key={opt.key} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onClick={() => {
                    setSortKey(opt.key);
                    setSortSheetOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-2 py-3.5 rounded-lg text-[15px] transition-colors active:bg-gray-50 ${
                    isActive
                      ? 'text-primary font-medium'
                      : 'text-foreground'
                  }`}
                >
                  {t(opt.tKey)}
                  {isActive && (
                    <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <span className="w-2 h-2 bg-white rounded-full" />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </MobileSheet>

      {/* Collection manager */}
      <CollectionManager
        mode={managerMode}
        collection={managingCollection}
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        onCreate={handleCreateCollection}
        onRename={handleRenameCollection}
        onDelete={handleDeleteCollection}
      />

      {/* Add to collection sheet */}
      <AddToCollectionSheet
        open={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        favoriteId={addSheetFavoriteId}
        collections={collections}
        onCollectionsChange={loadCollections}
        onCreateClick={() => {
          setAddSheetOpen(false);
          setManagerMode('create');
          setManagingCollection(undefined);
          setManagerOpen(true);
        }}
      />
    </MobilePullRefresh>
  );
}
