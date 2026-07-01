export const DEFAULT_DESKTOP_PRODUCT_LIMIT = 60;

export const DESKTOP_PRODUCT_PAGE_CONTAINER_CLASS =
  'mx-auto w-full max-w-[1840px] px-3 lg:px-4 2xl:px-5';

export const DESKTOP_PRODUCT_SIDEBAR_CLASS =
  'w-52 xl:w-56 flex-shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto';

export const DESKTOP_PRODUCT_GRID_CLASS =
  'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 min-[1800px]:grid-cols-6 gap-4';

export const DESKTOP_PRODUCT_COMPACT_GRID_CLASS =
  'grid grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 gap-3';

export const DESKTOP_PRODUCT_LIST_CLASS = 'flex flex-col gap-4';

export const DESKTOP_PRODUCT_SKELETON_COUNT = 15;

export const DESKTOP_PRODUCT_IMAGE_SIZES =
  '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 20vw, 16vw';

export function getDesktopProductGridClass(viewMode: 'grid' | 'list' | 'compact'): string {
  if (viewMode === 'list') {
    return DESKTOP_PRODUCT_LIST_CLASS;
  }

  if (viewMode === 'compact') {
    return DESKTOP_PRODUCT_COMPACT_GRID_CLASS;
  }

  return DESKTOP_PRODUCT_GRID_CLASS;
}
