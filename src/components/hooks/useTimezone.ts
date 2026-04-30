import { formatInTimeZone, utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { TIMEZONE_CONFIG, TIMEZONE_LEGACY } from '@/lib/constants';
import { getTimezone } from '@/lib/date';
import { setItem } from '@/lib/storage';
import { setTimezone, useApp } from '@/store/app';
import { useLocale } from './useLocale';

const selector = (state: { timezone: string }) => state.timezone;

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
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{3})?Z$/.test(date)
        ? date
        : `${date.split(' ').join('T')}Z`,
      timezone,
      pattern,
      { locale: dateLocale },
    );
  };

  const formatSeriesTimezone = (data: any, column: string, timezone: string) => {
    const format = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    return data.map(item => {
      const parts = format.formatToParts(new Date(item[column]));
      const lookup: Record<string, string> = {};
      for (const p of parts) lookup[p.type] = p.value;

      return {
        ...item,
        [column]: `${lookup.year}-${lookup.month}-${lookup.day} ${lookup.hour}:${lookup.minute}:${lookup.second}`,
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
