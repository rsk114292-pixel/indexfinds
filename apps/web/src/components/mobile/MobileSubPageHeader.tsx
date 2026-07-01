'use client';

import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { useScrollDirection } from '@/hooks/useScrollDirection';

interface MobileSubPageHeaderProps {
  title: string;
  rightAction?: React.ReactNode;
  scrollHide?: boolean;
}

/**
 * 移动端子页面顶栏
 *
 * 用于从 Tab 根页面进入的子页面（如浏览历史、安全设置、品牌详情等），
 * 提供返回按钮 + 页面标题。
 *
 * 规格：
 * - 与 MobileHeader 同层级 fixed + z-20，DOM 顺序靠后自动覆盖
 * - 同高 h-12 (48px)，同安全区处理
 * - 仅 <lg 显示，PC 端不渲染
 */
export default function MobileSubPageHeader({
  title,
  rightAction,
  scrollHide = false,
}: MobileSubPageHeaderProps) {
  const router = useRouter();
  const tc = useTranslations('common');
  const { headerVisible } = useScrollDirection({ disabled: !scrollHide });

  return (
    <>
      <header className={`fixed inset-x-0 top-0 z-20 bg-surface pt-[env(safe-area-inset-top)] shadow-[0_1px_0_rgba(0,0,0,0.06)] lg:hidden transition-transform duration-300 ${
        headerVisible ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <div className="flex h-12 items-center px-1">
          {/* 返回按钮 */}
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-11 w-11 items-center justify-center rounded-full active:scale-95 active:bg-gray-100 transition-transform duration-150"
            aria-label={tc('goBack')}
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>

          {/* 标题 */}
          <h1 className="flex-1 text-base font-semibold text-foreground truncate pr-2 rtl:pl-2 rtl:pr-0">
            {title}
          </h1>

          {/* 右侧操作区（可选） */}
          {rightAction && (
            <div className="flex items-center pr-2 rtl:pl-2 rtl:pr-0">{rightAction}</div>
          )}
        </div>
      </header>
    </>
  );
}
