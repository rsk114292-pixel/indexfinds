export type NoticeTone = 'success' | 'error' | 'warning' | 'info';

export const NOTICE_EVENT = 'indexfinds:notice';

export interface NoticeDetail {
  message: string;
  tone: NoticeTone;
}

function publish(message: string, tone: NoticeTone) {
  if (typeof window === 'undefined' || !message) return;
  window.dispatchEvent(
    new CustomEvent<NoticeDetail>(NOTICE_EVENT, {
      detail: { message, tone },
    }),
  );
}

export const notice = {
  success: (message: string) => publish(message, 'success'),
  error: (message: string) => publish(message, 'error'),
  warning: (message: string) => publish(message, 'warning'),
  info: (message: string) => publish(message, 'info'),
};
