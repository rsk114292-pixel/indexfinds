import { useMediaQuery } from './useMediaQuery';

/**
 * 设备检测 Hook（仅用于交互逻辑）
 *
 * 适用场景：控制手势方向、触控反馈、下拉刷新启用等行为逻辑
 * 不适用：决定渲染哪套组件树（应使用 CSS hidden/lg:block 方案）
 *
 * 内部使用 useMediaQuery（基于 useSyncExternalStore），SSR 返回 false，
 * 客户端 hydrate 时同步获取正确值，无一帧闪烁。
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 1023px)');
}
