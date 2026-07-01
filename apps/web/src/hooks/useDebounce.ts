import { useEffect, useState } from 'react';

/**
 * 防抖Hook - 延迟更新值
 * @param value 原始值
 * @param delay 延迟时间（毫秒）
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // 设置定时器
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // 清理函数：如果value在delay时间内再次变化，取消上一次的定时器
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
