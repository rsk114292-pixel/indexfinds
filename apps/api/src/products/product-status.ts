/**
 * 商品状态管理
 * 定义状态枚举、流转规则、校验逻辑
 */

/**
 * 商品状态枚举
 */
export enum ProductStatus {
  DRAFT = 'draft', // 草稿：新建或退回修改
  PENDING_REVIEW = 'pending_review', // 待审核：提交等待审核
  ACTIVE = 'active', // 已上架：审核通过，正常销售
  INACTIVE = 'inactive', // 已下架：手动下架
  OUT_OF_STOCK = 'out_of_stock', // 缺货：库存为 0
  SPLIT = 'split', // 已拆分：混合商品拆分后的原商品
}

/**
 * SKU 状态枚举
 */
export enum SkuStatus {
  AVAILABLE = 'available', // 可售
  OUT_OF_STOCK = 'out_of_stock', // 缺货
  DISCONTINUED = 'discontinued', // 停售
}

/**
 * 状态流转动作
 */
export enum ProductStatusAction {
  SUBMIT_FOR_REVIEW = 'submit_for_review', // 提交审核
  APPROVE = 'approve', // 审核通过
  REJECT = 'reject', // 审核拒绝
  PUBLISH = 'publish', // 直接发布（跳过审核）
  UNPUBLISH = 'unpublish', // 下架
  MARK_OUT_OF_STOCK = 'mark_out_of_stock', // 标记缺货
  RESTOCK = 'restock', // 补货
  REPUBLISH = 'republish', // 重新上架（需重新审核）
}

/**
 * 状态流转规则
 * key: 当前状态
 * value: 允许的 (动作 -> 目标状态) 映射
 */
export const STATUS_TRANSITIONS: Record<
  ProductStatus,
  Partial<Record<ProductStatusAction, ProductStatus>>
> = {
  [ProductStatus.DRAFT]: {
    [ProductStatusAction.SUBMIT_FOR_REVIEW]: ProductStatus.PENDING_REVIEW,
    [ProductStatusAction.PUBLISH]: ProductStatus.ACTIVE, // 管理员直接发布
  },

  [ProductStatus.PENDING_REVIEW]: {
    [ProductStatusAction.APPROVE]: ProductStatus.ACTIVE,
    [ProductStatusAction.REJECT]: ProductStatus.DRAFT,
  },

  [ProductStatus.ACTIVE]: {
    [ProductStatusAction.UNPUBLISH]: ProductStatus.INACTIVE,
    [ProductStatusAction.MARK_OUT_OF_STOCK]: ProductStatus.OUT_OF_STOCK,
  },

  [ProductStatus.INACTIVE]: {
    [ProductStatusAction.REPUBLISH]: ProductStatus.PENDING_REVIEW,
    [ProductStatusAction.PUBLISH]: ProductStatus.ACTIVE, // 管理员直接发布
  },

  [ProductStatus.OUT_OF_STOCK]: {
    [ProductStatusAction.RESTOCK]: ProductStatus.ACTIVE,
    [ProductStatusAction.UNPUBLISH]: ProductStatus.INACTIVE,
  },

  // 已拆分状态：原商品被拆分后不可恢复，只能查看
  [ProductStatus.SPLIT]: {
    // 拆分后的商品不允许任何状态流转
  },
};

/**
 * 检查状态流转是否合法
 * @param currentStatus 当前状态
 * @param action 动作
 * @returns 目标状态，如果流转不合法则返回 null
 */
export function getNextStatus(
  currentStatus: ProductStatus | string,
  action: ProductStatusAction,
): ProductStatus | null {
  const transitions = STATUS_TRANSITIONS[currentStatus as ProductStatus];
  if (!transitions) {
    return null;
  }

  return transitions[action] || null;
}

/**
 * 检查是否可以执行某个动作
 */
export function canPerformAction(
  currentStatus: ProductStatus | string,
  action: ProductStatusAction,
): boolean {
  return getNextStatus(currentStatus, action) !== null;
}

/**
 * 获取当前状态下可执行的所有动作
 */
export function getAvailableActions(
  currentStatus: ProductStatus | string,
): ProductStatusAction[] {
  const transitions = STATUS_TRANSITIONS[currentStatus as ProductStatus];
  if (!transitions) {
    return [];
  }

  return Object.keys(transitions) as ProductStatusAction[];
}

/**
 * 状态显示名称（用于 UI）
 */
export const STATUS_DISPLAY_NAMES: Record<ProductStatus, string> = {
  [ProductStatus.DRAFT]: '草稿',
  [ProductStatus.PENDING_REVIEW]: '待审核',
  [ProductStatus.ACTIVE]: '已上架',
  [ProductStatus.INACTIVE]: '已下架',
  [ProductStatus.OUT_OF_STOCK]: '缺货',
  [ProductStatus.SPLIT]: '已拆分',
};

/**
 * 动作显示名称（用于 UI）
 */
export const ACTION_DISPLAY_NAMES: Record<ProductStatusAction, string> = {
  [ProductStatusAction.SUBMIT_FOR_REVIEW]: '提交审核',
  [ProductStatusAction.APPROVE]: '审核通过',
  [ProductStatusAction.REJECT]: '审核拒绝',
  [ProductStatusAction.PUBLISH]: '直接发布',
  [ProductStatusAction.UNPUBLISH]: '下架',
  [ProductStatusAction.MARK_OUT_OF_STOCK]: '标记缺货',
  [ProductStatusAction.RESTOCK]: '补货上架',
  [ProductStatusAction.REPUBLISH]: '重新上架',
};
