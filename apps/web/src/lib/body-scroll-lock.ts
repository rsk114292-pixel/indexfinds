type RestoreSnapshot = {
  overflow: string;
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
  paddingRight: string;
  scrollY: number;
};

let lockCount = 0;
let restoreSnapshot: RestoreSnapshot | null = null;

function getScrollbarWidth(): number {
  return window.innerWidth - document.documentElement.clientWidth;
}

/** 强制解除所有滚动锁（路由切换等场景的安全网） */
export function forceUnlockBodyScroll(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (lockCount === 0) return;

  lockCount = 0;
  const snapshot = restoreSnapshot;
  restoreSnapshot = null;

  if (!snapshot) return;

  const bodyStyle = document.body.style;
  bodyStyle.overflow = snapshot.overflow;
  bodyStyle.position = snapshot.position;
  bodyStyle.top = snapshot.top;
  bodyStyle.left = snapshot.left;
  bodyStyle.right = snapshot.right;
  bodyStyle.width = snapshot.width;
  bodyStyle.paddingRight = snapshot.paddingRight;

  window.scrollTo(0, snapshot.scrollY);
}

export function lockBodyScroll(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  if (lockCount === 0) {
    const bodyStyle = document.body.style;
    restoreSnapshot = {
      overflow: bodyStyle.overflow,
      position: bodyStyle.position,
      top: bodyStyle.top,
      left: bodyStyle.left,
      right: bodyStyle.right,
      width: bodyStyle.width,
      paddingRight: bodyStyle.paddingRight,
      scrollY: window.scrollY,
    };

    const scrollbarWidth = getScrollbarWidth();
    if (scrollbarWidth > 0) {
      bodyStyle.paddingRight = `${scrollbarWidth}px`;
    }

    bodyStyle.overflow = 'hidden';
    bodyStyle.position = 'fixed';
    bodyStyle.top = `-${restoreSnapshot.scrollY}px`;
    bodyStyle.left = '0';
    bodyStyle.right = '0';
    bodyStyle.width = '100%';
  }

  lockCount += 1;
  let released = false;

  return () => {
    if (released) return;
    released = true;

    lockCount = Math.max(0, lockCount - 1);
    if (lockCount !== 0) return;

    const snapshot = restoreSnapshot;
    restoreSnapshot = null;

    if (!snapshot) return;

    const bodyStyle = document.body.style;
    bodyStyle.overflow = snapshot.overflow;
    bodyStyle.position = snapshot.position;
    bodyStyle.top = snapshot.top;
    bodyStyle.left = snapshot.left;
    bodyStyle.right = snapshot.right;
    bodyStyle.width = snapshot.width;
    bodyStyle.paddingRight = snapshot.paddingRight;

    window.scrollTo(0, snapshot.scrollY);
  };
}
