'use client';

/**
 * 移动端页面转场动画（Phase 4.4）
 *
 * 在 Next.js App Router 中，layout 保持挂载，children（page）由框架切换。
 * 使用 pathname 变化触发 Framer Motion 入场动画，提供 App-like 的页面切换体验。
 *
 * 动画规格（Section 3.6）：
 * - 页面切换：250ms / ease-out
 * - 仅使用 transform + opacity（GPU 加速）
 * - 支持 prefers-reduced-motion: reduce
 *
 * 仅在移动端生效（由 layout 中的 ImmersiveMain 包裹，PC 端动画几乎不可见）。
 */

import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';

interface MobilePageTransitionProps {
  children: React.ReactNode;
}

export default function MobilePageTransition({ children }: MobilePageTransitionProps) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  const animation = useMemo(() => {
    if (prefersReducedMotion) {
      return { initial: false as const, animate: {} };
    }
    return {
      initial: { opacity: 0 },
      animate: {
        opacity: 1,
        transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const },
      },
    };
  }, [prefersReducedMotion]);

  return (
    <motion.div
      key={pathname}
      initial={animation.initial}
      animate={animation.animate}
    >
      {children}
    </motion.div>
  );
}
