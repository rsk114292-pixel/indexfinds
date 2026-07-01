import { BatchJobItemStatus } from '../entities/batch-job-item.entity';

/**
 * 状态转换定义
 * 定义每个状态可以转换到哪些目标状态
 */
const STATE_TRANSITIONS: Record<BatchJobItemStatus, BatchJobItemStatus[]> = {
  // PENDING: 初始状态，可以开始抓取
  [BatchJobItemStatus.PENDING]: [BatchJobItemStatus.FETCHING],

  // FETCHING: 抓取中，可以成功/跳过/失败
  [BatchJobItemStatus.FETCHING]: [
    BatchJobItemStatus.FETCHED,
    BatchJobItemStatus.SKIPPED,
    BatchJobItemStatus.FAILED,
  ],

  // FETCHED: 抓取完成，开始 AI 生成（或去重后直接进入审核）
  [BatchJobItemStatus.FETCHED]: [
    BatchJobItemStatus.GENERATING,
    BatchJobItemStatus.REVIEW, // 图片去重检测到重复，跳过 AI 直接审核
    BatchJobItemStatus.FAILED, // 如果 sourceData 丢失
  ],

  // GENERATING: AI 生成中，可以进入审核/已审核/失败
  [BatchJobItemStatus.GENERATING]: [
    BatchJobItemStatus.REVIEW,
    BatchJobItemStatus.APPROVED,
    BatchJobItemStatus.FAILED,
  ],

  // REVIEW: 待审核，可以通过审核或标记失败
  [BatchJobItemStatus.REVIEW]: [
    BatchJobItemStatus.APPROVED,
    BatchJobItemStatus.FAILED,
  ],

  // APPROVED: 已审核，可以发布/退回审核/失败
  [BatchJobItemStatus.APPROVED]: [
    BatchJobItemStatus.PUBLISHED,
    BatchJobItemStatus.REVIEW, // 发布失败退回
    BatchJobItemStatus.FAILED,
  ],

  // PUBLISHED: 终态，不能转换（除非重新导入）
  [BatchJobItemStatus.PUBLISHED]: [],

  // FAILED: 失败，可以重试回到 PENDING
  [BatchJobItemStatus.FAILED]: [BatchJobItemStatus.PENDING],

  // SKIPPED: 跳过，终态
  [BatchJobItemStatus.SKIPPED]: [],

  // CANCELLED: 取消，终态
  [BatchJobItemStatus.CANCELLED]: [],
};

/**
 * 状态转换结果
 */
export interface TransitionResult {
  success: boolean;
  error?: string;
  from: BatchJobItemStatus;
  to: BatchJobItemStatus;
}

/**
 * 状态转换验证错误
 */
export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly from: BatchJobItemStatus,
    public readonly to: BatchJobItemStatus,
    public readonly itemId?: string,
  ) {
    const itemInfo = itemId ? ` [item: ${itemId}]` : '';
    super(`Invalid state transition: ${from} → ${to}${itemInfo}`);
    this.name = 'InvalidStateTransitionError';
    Object.setPrototypeOf(this, InvalidStateTransitionError.prototype);
  }
}

/**
 * 批量任务项状态机
 * 负责验证和管理状态转换
 */
export class BatchItemStateMachine {
  /**
   * 检查状态转换是否合法
   */
  static canTransition(
    from: BatchJobItemStatus,
    to: BatchJobItemStatus,
  ): boolean {
    const allowedTargets = STATE_TRANSITIONS[from];
    return allowedTargets?.includes(to) ?? false;
  }

  /**
   * 验证状态转换，不合法则抛出异常
   */
  static validateTransition(
    from: BatchJobItemStatus,
    to: BatchJobItemStatus,
    itemId?: string,
  ): void {
    if (!this.canTransition(from, to)) {
      throw new InvalidStateTransitionError(from, to, itemId);
    }
  }

  /**
   * 尝试状态转换，返回结果而非抛出异常
   */
  static tryTransition(
    from: BatchJobItemStatus,
    to: BatchJobItemStatus,
  ): TransitionResult {
    if (this.canTransition(from, to)) {
      return { success: true, from, to };
    }
    return {
      success: false,
      error: `Cannot transition from ${from} to ${to}`,
      from,
      to,
    };
  }

  /**
   * 获取某状态可转换的目标状态列表
   */
  static getAllowedTransitions(from: BatchJobItemStatus): BatchJobItemStatus[] {
    return STATE_TRANSITIONS[from] ?? [];
  }

  /**
   * 检查是否为终态（不能再转换）
   */
  static isTerminalState(status: BatchJobItemStatus): boolean {
    return STATE_TRANSITIONS[status]?.length === 0;
  }

  /**
   * 检查是否为可重试状态
   */
  static isRetryableState(status: BatchJobItemStatus): boolean {
    return status === BatchJobItemStatus.FAILED;
  }

  /**
   * 检查是否为成功终态
   */
  static isSuccessState(status: BatchJobItemStatus): boolean {
    return (
      status === BatchJobItemStatus.PUBLISHED ||
      status === BatchJobItemStatus.SKIPPED
    );
  }

  /**
   * 检查是否为处理中状态
   */
  static isProcessingState(status: BatchJobItemStatus): boolean {
    return [
      BatchJobItemStatus.FETCHING,
      BatchJobItemStatus.FETCHED,
      BatchJobItemStatus.GENERATING,
    ].includes(status);
  }

  /**
   * 检查是否为待人工处理状态
   */
  static isAwaitingHumanAction(status: BatchJobItemStatus): boolean {
    return [BatchJobItemStatus.REVIEW, BatchJobItemStatus.APPROVED].includes(
      status,
    );
  }

  /**
   * 获取状态的中文描述
   */
  static getStatusLabel(status: BatchJobItemStatus): string {
    const labels: Record<BatchJobItemStatus, string> = {
      [BatchJobItemStatus.PENDING]: '待处理',
      [BatchJobItemStatus.FETCHING]: '抓取中',
      [BatchJobItemStatus.FETCHED]: '抓取完成',
      [BatchJobItemStatus.GENERATING]: 'AI生成中',
      [BatchJobItemStatus.REVIEW]: '待审核',
      [BatchJobItemStatus.APPROVED]: '已审核',
      [BatchJobItemStatus.PUBLISHED]: '已发布',
      [BatchJobItemStatus.FAILED]: '失败',
      [BatchJobItemStatus.SKIPPED]: '已跳过',
      [BatchJobItemStatus.CANCELLED]: '已取消',
    };
    return labels[status] ?? status;
  }

  /**
   * 获取完整的状态流转图（用于调试/文档）
   */
  static getTransitionGraph(): string {
    const lines: string[] = [
      '状态转换图:',
      '===========',
      '',
      'PENDING ──→ FETCHING',
      '              │',
      '              ├──→ FETCHED ──→ GENERATING',
      '              │                    │',
      '              ├──→ SKIPPED        ├──→ REVIEW ──→ APPROVED',
      '              │     (终态)         │       │          │',
      '              └──→ FAILED ←───────┴───────┘          │',
      '                    │                                 │',
      '                    └──→ PENDING (重试)               │',
      '                                                      │',
      '                                           PUBLISHED ←┘',
      '                                            (终态)',
    ];
    return lines.join('\n');
  }
}

/**
 * 状态转换日志记录（可选功能）
 */
export interface StateTransitionLog {
  itemId: string;
  from: BatchJobItemStatus;
  to: BatchJobItemStatus;
  timestamp: Date;
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
}
