declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Google Analytics 全局 API，参数类型由 GA4 SDK 定义
    gtag?: (...args: any[]) => void;
    google_tag_manager?: unknown;
    dataLayer?: unknown[];
  }
}

export {};
