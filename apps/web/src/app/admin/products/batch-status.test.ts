import {
  getBatchStatusActions,
  normalizeBatchStatusAction,
} from './batch-status';

describe('admin products batch status helpers', () => {
  it('uses approve/reject actions for pending review tabs', () => {
    expect(getBatchStatusActions('pending_review')).toEqual([
      { action: 'approve', label: '审核通过', type: 'primary' },
      { action: 'reject', label: '退回草稿' },
    ]);
  });

  it('uses publish/unpublish actions for normal tabs', () => {
    expect(getBatchStatusActions()).toEqual([
      { action: 'publish', label: '上架' },
      { action: 'unpublish', label: '下架' },
    ]);
  });

  it('normalizes publish to approve when all selected products are pending review', () => {
    expect(
      normalizeBatchStatusAction('publish', [
        { status: 'pending_review' },
        { status: 'pending_review' },
      ]),
    ).toBe('approve');
  });

  it('keeps publish unchanged when selected products are not all pending review', () => {
    expect(
      normalizeBatchStatusAction('publish', [
        { status: 'pending_review' },
        { status: 'active' },
      ]),
    ).toBe('publish');
  });
});
