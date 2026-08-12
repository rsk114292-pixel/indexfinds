'use client';

import { useEffect, useCallback, useRef, useId } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface MobileSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** 最大高度，默认 90vh */
  maxHeight?: string;
}

const DRAG_CLOSE_THRESHOLD = 100;
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * 移动端底部弹出面板（Bottom Sheet）
 *
 * 规格（Section 3.7）:
 * - 顶部圆角 16px, 拖拽指示条 36×4px
 * - 遮罩 z-30, Sheet z-40
 * - 弹出 300ms cubic-bezier(0.32,0.72,0,1), 收起 200ms ease-in
 * - 底部安全区 pb-[env(safe-area-inset-bottom)]
 * - ARIA: role="dialog", aria-modal, aria-labelledby
 * - 焦点陷阱: Tab/Shift+Tab 循环在 Sheet 内部
 */
export function MobileSheet({
  open,
  onClose,
  title,
  children,
  maxHeight = '90vh',
}: MobileSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('mobile-sheet-open');
    return () => document.body.classList.remove('mobile-sheet-open');
  }, [open]);

  // 保存并恢复焦点 + ESC 关闭 + 焦点陷阱
  useEffect(() => {
    if (!open) return;

    // 保存当前焦点
    previousFocusRef.current = document.activeElement as HTMLElement;

    // 延迟聚焦到 Sheet 内部
    const focusTimer = setTimeout(() => {
      const sheet = sheetRef.current;
      if (!sheet) return;
      const firstFocusable = sheet.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        sheet.focus();
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // 焦点陷阱
      if (e.key === 'Tab') {
        const sheet = sheetRef.current;
        if (!sheet) return;

        const focusableElements = Array.from(
          sheet.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        );
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstEl = focusableElements[0];
        const lastEl = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      // 恢复之前的焦点
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.y > DRAG_CLOSE_THRESHOLD || info.velocity.y > 500) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 遮罩层 z-30 */}
          <motion.div
            className="fixed inset-0 z-30 bg-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet z-40 */}
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            className="fixed inset-x-0 bottom-0 z-40 rounded-t-2xl bg-surface shadow-[0_-4px_24px_rgba(0,0,0,0.12)] outline-none"
            style={{ maxHeight }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'tween',
              ease: [0.32, 0.72, 0, 1],
              duration: 0.3,
            }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
          >
            {/* 拖拽指示条 36×4px */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="h-1 w-9 rounded-full bg-gray-300" />
            </div>

            {/* 标题 */}
            {title && (
              <div
                id={titleId}
                className="px-4 pb-3 text-center text-base font-semibold text-foreground"
              >
                {title}
              </div>
            )}

            {/* 内容区域 */}
            <div
              className="overflow-y-auto overscroll-contain px-4 pb-[env(safe-area-inset-bottom)]"
              style={{ maxHeight: `calc(${maxHeight} - 60px)` }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
