import { useMemo } from 'react';
import { useLocale } from '@/components/hooks/useLocale';
import { useNavigation } from '@/components/hooks/useNavigation';
import { DATE_RANGE_CONFIG, DEFAULT_DATE_RANGE_VALUE } from '@/lib/constants';
import { getCompareDate, getOffsetDateRange, parseDateRange } from '@/lib/date';
import { getItem } from '@/lib/storage';

export function useDateRange(options: { ignoreOffset?: boolean; timezone?: string } = {}) {
  const { ignoreOffset = false, timezone } = options;
  const {
    query: { date = '', unit = '', offset = 0, compare = 'prev' },
  } = useNavigation();
  const { locale } = useLocale();
  const dateRange = useMemo(() => {
    const dateRangeObject = parseDateRange(
      date || getItem(DATE_RANGE_CONFIG) || DEFAULT_DATE_RANGE_VALUE,
      unit,
      locale,
      timezone,
    );

    return !ignoreOffset && offset ? getOffsetDateRange(dateRangeObject, +offset) : dateRangeObject;
  }, [date, ignoreOffset, locale, offset, timezone, unit]);

  const dateCompare = useMemo(
    () => getCompareDate(compare, dateRange.startDate, dateRange.endDate),
    [compare, dateRange.endDate, dateRange.startDate],
  );

  return {
    date,
    unit,
    offset,
    compare,
    isAllTime: date.endsWith(`:all`),
    isCustomRange: date.startsWith('range:'),
    dateRange,
    dateCompare,
  };
}
