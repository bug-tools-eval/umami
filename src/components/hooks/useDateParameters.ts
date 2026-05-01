import { useMemo } from 'react';
import { useDateRange } from './useDateRange';
import { useTimezone } from './useTimezone';

export function useDateParameters() {
  const {
    dateRange: { startDate, endDate, unit },
  } = useDateRange();
  const { timezone, localToUtc, canonicalizeTimezone } = useTimezone();

  return useMemo(() => {
    const utcStartDate = localToUtc(startDate);
    const utcEndDate = localToUtc(endDate);

    return {
      startAt: +utcStartDate,
      endAt: +utcEndDate,
      startDate: utcStartDate.toISOString(),
      endDate: utcEndDate.toISOString(),
      unit,
      timezone: canonicalizeTimezone(timezone),
    };
  }, [canonicalizeTimezone, endDate, localToUtc, startDate, timezone, unit]);
}
