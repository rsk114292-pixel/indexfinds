import type { Product } from '@/types';

export type BatchStatusAction =
  | 'approve'
  | 'reject'
  | 'publish'
  | 'unpublish';

export interface BatchStatusActionConfig {
  action: BatchStatusAction;
  label: string;
  type?: 'primary';
}

export function getBatchStatusActions(
  fixedStatus?: string,
): BatchStatusActionConfig[] {
  if (fixedStatus === 'pending_review') {
    return [
      { action: 'approve', label: '审核通过', type: 'primary' },
      { action: 'reject', label: '退回草稿' },
    ];
  }

  return [
    { action: 'publish', label: '上架' },
    { action: 'unpublish', label: '下架' },
  ];
}

export function normalizeBatchStatusAction(
  action: string,
  selectedProducts: Array<Pick<Product, 'status'>>,
): string {
  const allSelectedPendingReview =
    selectedProducts.length > 0 &&
    selectedProducts.every((product) => product.status === 'pending_review');

  return action === 'publish' && allSelectedPendingReview ? 'approve' : action;
}
