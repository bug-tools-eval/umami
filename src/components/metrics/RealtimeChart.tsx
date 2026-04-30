import { startOfMinute, subMinutes } from 'date-fns';
import { useMemo, useRef } from 'react';
import { useTimezone } from '@/components/hooks';
import { DEFAULT_ANIMATION_DURATION, REALTIME_RANGE } from '@/lib/constants';
import type { RealtimeData } from '@/lib/types';
import { PageviewsChart } from './PageviewsChart';

export interface RealtimeChartProps {
  data: RealtimeData;
  unit: string;
  className?: string;
}

export function RealtimeChart({ data, unit, ...props }: RealtimeChartProps) {
  const { formatSeriesTimezone, fromUtc, timezone } = useTimezone();
  const endTime = startOfMinute(new Date()).getTime();
  const { startDate, endDate } = useMemo(
    () => ({
      endDate: new Date(endTime),
      startDate: subMinutes(new Date(endTime), REALTIME_RANGE),
    }),
    [endTime],
  );
  const prevEndTime = useRef(endTime);
  const prevChartData = useRef<{ pageviews: any[]; sessions: any[] } | null>(null);

  const chartData = useMemo(() => {
    if (!data) {
      return { pageviews: [], sessions: [] };
    }

    return {
      pageviews: formatSeriesTimezone(data.series.views, 'x', timezone),
      sessions: formatSeriesTimezone(data.series.visitors, 'x', timezone),
    };
  }, [data, startDate, endDate, unit, timezone]);

  const animationDuration = useMemo(() => {
    // Don't animate the bars shifting over because it looks weird
    if (prevEndTime.current < endTime) {
      prevEndTime.current = endTime;
      return 0;
    }

    // Don't animate when data hasn't changed
    if (prevChartData.current === chartData) {
      return 0;
    }
    prevChartData.current = chartData;

    return DEFAULT_ANIMATION_DURATION;
  }, [endTime, chartData]);

  return (
    <PageviewsChart
      {...props}
      minDate={fromUtc(startDate)}
      maxDate={fromUtc(endDate)}
      unit={unit}
      data={chartData}
      animationDuration={animationDuration}
    />
  );
}
