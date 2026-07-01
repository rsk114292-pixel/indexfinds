import { useMediaQuery } from './useMediaQuery';

const LG_BREAKPOINT = 1024;

export function useLgUp(): boolean {
  return useMediaQuery(`(min-width: ${LG_BREAKPOINT}px)`);
}

