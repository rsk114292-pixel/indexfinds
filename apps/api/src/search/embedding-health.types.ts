/**
 * Embedding 服务健康检查类型定义
 */

/**
 * 单个 Embedding 服务状态
 */
export interface EmbeddingServiceStatus {
  available: boolean;
  model: string;
  dimensions: number;
}

/**
 * 服务状态变化事件
 */
export interface StateChangeEvent {
  service: 'text' | 'image';
  serviceName: string;
  from: boolean;
  to: boolean;
  at: Date;
}

/**
 * Embedding 健康状态
 */
export interface EmbeddingHealthStatus {
  text: EmbeddingServiceStatus;
  image: EmbeddingServiceStatus;
  embeddingServiceUrl: string;
  lastCheckTime: Date | null;
  consecutiveFailures: number;
  lastStateChange: StateChangeEvent | null;
  nextCheckInMs: number;
}

/**
 * Embedding 服务健康检查响应
 */
export interface EmbeddingServiceHealthResponse {
  status: 'ok' | 'partial' | 'error';
  models: {
    text: {
      name: string;
      dimensions: number;
      loaded: boolean;
    };
    image: {
      name: string;
      dimensions: number;
      loaded: boolean;
    };
  };
}
