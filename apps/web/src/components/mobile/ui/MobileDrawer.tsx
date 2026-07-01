'use client';

import { useEffect, useRef, useId } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * 移动端左侧抽屉面板（Left Drawer）
 *
 * - 从左侧滑入，宽度 80vw / max 320px
 * - 遮罩 z-30, Drawer z-40
 * - 弹出 300ms cubic-bezier(0.32,0.72,0,1), 收起 200ms ease-in
 * - 顶部安全区 pt-[env(safe-area-inset-top)]
 * - ARIA: role="dialog", aria-modal, aria-labelledby
 * - 焦点陷阱: Tab/Shift+Tab 循环
 */
export function MobileDrawer({
  open,
  onClose,
  title,
  children,
}: MobileDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    const focusTimer = setTimeout(() => {
      const drawer = drawerRef.current;
      if (!drawer) return;
      const firstFocusable = drawer.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        drawer.focus();
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const drawer = drawerRef.current;
        if (!drawer) return;

        const focusableElements = Array.from(
          drawer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
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
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

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

          {/* Drawer z-40 */}
          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            className="fixed inset-y-0 left-0 z-40 flex w-[80vw] max-w-[320px] flex-col bg-surface shadow-[4px_0_24px_rgba(0,0,0,0.12)] outline-none pt-[env(safe-area-inset-top)]"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{
              type: 'tween',
              ease: [0.32, 0.72, 0, 1],
              duration: 0.3,
            }}
          >
            {/* 隐藏标题供 aria-labelledby */}
            {title && (
              <span id={titleId} className="sr-only">
                {title}
              </span>
            )}

            {/* 内容区域 - 可滚动 */}
            <div className="flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
