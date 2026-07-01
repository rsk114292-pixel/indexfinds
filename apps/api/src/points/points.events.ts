export const PointsEvents = {
  /** 请求发放积分（由各业务模块 emit） */
  EARN_REQUEST: 'points.earn.request',
  /** 积分已发放（由 PointsService emit，供通知等下游消费） */
  EARNED: 'points.earned',
} as const;

export interface EarnPointsRequestEvent {
  userId: string;
  action: string;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, any>;
}

export interface PointsEarnedEvent {
  userId: string;
  action: string;
  amount: number;
  newBalance: number;
}
