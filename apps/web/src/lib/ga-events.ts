/**
 * GA4 事件发送工具
 *
 * 封装 gtag 事件发送，仅在 GA4 已加载时执行。
 * 依赖: apps/web/src/types/gtag.d.ts 中的全局类型声明
 */

import {
  getAnalyticsDiagnostics,
  recordAnalyticsEvent,
} from '@/lib/analytics-diagnostics';
import { scheduleVisitDiagnosticsSync } from '@/lib/visit-tracking';

type GAEventParams = Record<string, string | number | boolean | undefined>;

interface QueuedGAEvent {
  eventName: string;
  params: GAEventParams;
}

const queuedEvents: QueuedGAEvent[] = [];
const MAX_QUEUED_EVENTS = 50;

let gaReady = false;

function canUseWindow(): boolean {
  return typeof window !== 'undefined';
}

function canSendNow(): boolean {
  return canUseWindow() && typeof window.gtag === 'function';
}

function shouldQueueEvent(): boolean {
  const diagnostics = getAnalyticsDiagnostics();

  if (diagnostics.consentStatus !== 'accepted') {
    return false;
  }

  if (diagnostics.gaTrackingEnabled === false) {
    return false;
  }

  return diagnostics.gaStatus === 'loading' || diagnostics.gaStatus === 'ready';
}

function sendEvent(eventName: string, params: GAEventParams): boolean {
  if (!canSendNow()) {
    return false;
  }

  const gtag = window.gtag;
  if (typeof gtag !== 'function') {
    return false;
  }

  gtag('event', eventName, params);
  recordAnalyticsEvent(eventName);
  scheduleVisitDiagnosticsSync();
  return true;
}

function enqueueEvent(eventName: string, params: GAEventParams): void {
  if (queuedEvents.length >= MAX_QUEUED_EVENTS) {
    queuedEvents.shift();
  }

  queuedEvents.push({ eventName, params });
}

export function setGA4Ready(ready: boolean): void {
  gaReady = ready;
}

export function resetGA4EventQueue(): void {
  queuedEvents.length = 0;
  gaReady = false;
}

export function flushQueuedGA4Events(): void {
  if (!gaReady || !canSendNow()) {
    return;
  }

  while (queuedEvents.length > 0) {
    const nextEvent = queuedEvents.shift();
    if (!nextEvent) {
      return;
    }

    if (!sendEvent(nextEvent.eventName, nextEvent.params)) {
      return;
    }
  }
}

export function trackGA4Event(eventName: string, params: GAEventParams) {
  if (sendEvent(eventName, params)) {
    return;
  }

  if (shouldQueueEvent()) {
    enqueueEvent(eventName, params);
  }
}
