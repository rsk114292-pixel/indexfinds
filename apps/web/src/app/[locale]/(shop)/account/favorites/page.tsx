'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Heart, ArrowUpDown, FolderPlus } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Empty } from '@/components/ui/Empty';
import { Alert } from '@/components/ui/Alert';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import ProductCard from '@/components/ProductCard';
import Pagination from '@/components/Pagination';
import CollectionTabs, {
  type CollectionTab,
} from '@/components/collections/CollectionTabs';
import CollectionManager from '@/components/collections/CollectionManager';
import AddToCollectionSheet from '@/components/collections/AddToCollectionSheet';
import MobileFavorites from '../components/mobile/MobileFavorites';
import { get, post, patch, del } from '@/lib/api';
import { buildAuthRedirectPath, buildLoginHref } from '@/lib/auth-redirect';
import type { FavoriteItem, CollectionResponse, PaginationMeta } from '@/types';

const PC_PAGE_SIZE = 20;

type SortKey = 'createdAt_DESC' | 'priceMin_ASC' | 'priceMin_DESC';

export default function AccountFavoritesPage() {
  const t = useTranslations('account');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { token, isAuthenticated, _hasHydrated } = useAuthStore();
  const loginHref = buildLoginHref(buildAuthRedirectPath(pathname, searchParams));

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.replace(loginHref);
    }
  }, [_hasHydrated, isAuthenticated, loginHref, router]);

  // Data state
  const [products, setProducts] = useState<FavoriteItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Collections state
  const [collections, setCollections] = useState<CollectionTab[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(
    null,
  );

  // Pagination & sorting
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt_DESC');

  // Dialog state
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerMode, setManagerMode] = useState<'create' | 'manage'>(
    'create',
  );
  const [managingCollection, setManagingCollection] =
    useState<CollectionTab | undefined>();

  // Add-to-collection state
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addSheetFavoriteId, setAddSheetFavoriteId] = useState('');

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

  // Load favorites (paginated)
  const loadFavorites = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [sort, order] = sortKey.split('_');
      const queryParams: Record<string, unknown> = {
        page,
        limit: PC_PAGE_SIZE,
        sort,
        order,
      };
      if (activeCollectionId) {
        queryParams.collectionId = activeCollectionId;
      }

      const data = await get<{ data: FavoriteItem[]; meta: PaginationMeta }>('/favorites', queryParams);
      setProducts(Array.isArray(data?.data) ? data.data : []);
      setTotal(data?.meta?.total ?? 0);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('failedToLoadFavorites'));
    } finally {
      setLoading(false);
    }
  }, [token, page, sortKey, activeCollectionId, t]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // When switching collection or sort, reset to page 1
  const handleCollectionChange = (id: string | null) => {
    setActiveCollectionId(id);
    setPage(1);
  };

  const handleSortChange = (key: SortKey) => {
    setSortKey(key);
    setPage(1);
  };

  // Collection CRUD handlers
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
    if (activeCollectionId === id) {
      setActiveCollectionId(null);
    }
    await loadCollections();
    await loadFavorites();
  };

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'createdAt_DESC', label: t('sortByTime') },
    { key: 'priceMin_ASC', label: t('sortByPriceAsc') },
    { key: 'priceMin_DESC', label: t('sortByPriceDesc') },
  ];

  // Defensive: ensure products is always an array for rendering
  const safeProducts = Array.isArray(products) ? products : [];

  return (
    <>
      {/* ── PC 端视图 ── */}
      <div className="hidden lg:block">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">
              {t('myFavorites')}
              {!loading && (
                <span className="ml-2 rtl:mr-2 rtl:ml-0 text-sm font-normal text-muted">
                  ({total})
                </span>
              )}
            </h2>

            {/* Sort dropdown */}
            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted hover:text-foreground hover:bg-muted/10 transition-colors"
              >
                <ArrowUpDown className="w-4 h-4" />
                {SORT_OPTIONS.find((o) => o.key === sortKey)?.label}
              </button>
              <div className="absolute right-0 rtl:left-0 rtl:right-auto top-full mt-1 w-48 bg-background border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleSortChange(opt.key)}
                    className={`w-full text-left rtl:text-right px-4 py-2.5 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${
                      sortKey === opt.key
                        ? 'text-primary bg-primary/5'
                        : 'text-foreground hover:bg-muted/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Collection tabs */}
          <CollectionTabs
            collections={collections}
            activeId={activeCollectionId}
            onChange={handleCollectionChange}
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

          {/* Error */}
          {error && (
            <Alert
              type="error"
              title={tCommon('error')}
              description={error}
            />
          )}

          {/* Loading */}
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Spinner size="lg" />
            </div>
          ) : safeProducts.length === 0 && !error ? (
            <Empty
              icon={<Heart className="w-12 h-12" />}
              title={t('noFavoritesYet')}
              description={t('noFavoritesDesc')}
            />
          ) : (
            <>
              <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
                {safeProducts.map((product) => (
                  <div key={product.id} className="relative group/card">
                    <ProductCard product={product} />
                    {collections.length > 0 && product.favoriteId && (
                      <button
                        type="button"
                        onClick={() => {
                          setAddSheetFavoriteId(product.favoriteId!);
                          setAddSheetOpen(true);
                        }}
                        className="absolute top-2 left-2 rtl:right-2 rtl:left-auto z-10 w-8 h-8 rounded-full bg-white/90 shadow-sm flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-white"
                        aria-label={t('addToCollection')}
                      >
                        <FolderPlus className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <Pagination
                current={page}
                total={total}
                pageSize={PC_PAGE_SIZE}
                onChange={(p) => setPage(p)}
              />
            </>
          )}
        </div>
      </div>

      {/* ── 移动端视图 ── */}
      <div className="lg:hidden">
        <MobileFavorites />
      </div>

      {/* ── Collection Manager Dialog ── */}
      <CollectionManager
        mode={managerMode}
        collection={managingCollection}
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        onCreate={handleCreateCollection}
        onRename={handleRenameCollection}
        onDelete={handleDeleteCollection}
      />

      {/* ── Add to Collection Sheet ── */}
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
    </>
  );
}
