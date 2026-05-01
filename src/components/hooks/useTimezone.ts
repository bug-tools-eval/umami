import { formatInTimeZone, utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { TIMEZONE_CONFIG, TIMEZONE_LEGACY } from '@/lib/constants';
import { getTimezone } from '@/lib/date';
import { setItem } from '@/lib/storage';
import { setTimezone, useApp } from '@/store/app';
import { useLocale } from './useLocale';

const selector = (state: { timezone: string }) => state.timezone;
const ISO_DATE_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{3})?Z$/;

const dtfCache = new Map<string, Intl.DateTimeFormat>();
function getSeriesFormatter(timezone: string): Intl.DateTimeFormat {
  let f = dtfCache.get(timezone);
  if (f) return f;
  f = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  dtfCache.set(timezone, f);
  return f;
}

export function useTimezone() {
  const timezone = useApp(selector);
  const localTimeZone = getTimezone();
  const { dateLocale } = useLocale();

  const saveTimezone = (value: string) => {
    setItem(TIMEZONE_CONFIG, value);
    setTimezone(value);
  };

  const formatTimezoneDate = (date: string, pattern: string) => {
    return formatInTimeZone(
      ISO_DATE_RE.test(date) ? date : `${date.split(' ').join('T')}Z`,
      timezone,
      pattern,
      { locale: dateLocale },
    );
  };

  const formatSeriesTimezone = (data: any, column: string, timezone: string) => {
    const format = getSeriesFormatter(timezone);

    return data.map(item => {
      const parts = format.formatToParts(new Date(item[column]));
      let year = '',
        month = '',
        day = '',
        hour = '',
        minute = '',
        second = '';
      for (const p of parts) {
        switch (p.type) {
          case 'year':
            year = p.value;
            break;
          case 'month':
            month = p.value;
            break;
          case 'day':
            day = p.value;
            break;
          case 'hour':
            hour = p.value;
            break;
          case 'minute':
            minute = p.value;
            break;
          case 'second':
            second = p.value;
            break;
        }
      }

      return {
        ...item,
        [column]: `${year}-${month}-${day} ${hour}:${minute}:${second}`,
      };
    });
  };

  const toUtc = (date: Date | string | number) => {
    return zonedTimeToUtc(date, timezone);
  };

  const fromUtc = (date: Date | string | number) => {
    return utcToZonedTime(date, timezone);
  };

  const localToUtc = (date: Date | string | number) => {
    return zonedTimeToUtc(date, localTimeZone);
  };

  const localFromUtc = (date: Date | string | number) => {
    return utcToZonedTime(date, localTimeZone);
  };

  const canonicalizeTimezone = (timezone: string): string => {
    return TIMEZONE_LEGACY[timezone] ?? timezone;
  };

  return {
    timezone,
    localTimeZone,
    toUtc,
    fromUtc,
    localToUtc,
    localFromUtc,
    saveTimezone,
    formatTimezoneDate,
    formatSeriesTimezone,
    canonicalizeTimezone,
  };
}
