import { useBreakpoint } from '@umami/react-zen';
import { useMemo } from 'react';

export function useMobile() {
  const breakpoint = useBreakpoint();

  return useMemo(
    () => ({
      breakpoint,
      isMobile: ['base', 'sm', 'md'].includes(breakpoint),
      isPhone: ['base', 'sm'].includes(breakpoint),
    }),
    [breakpoint],
  );
}
