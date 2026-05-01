import { colord } from 'colord';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart, type BarChartProps } from '@/components/charts/BarChart';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import {
  useDateRange,
  useLocale,
  useTimezone,
  useWebsiteEventsSeriesQuery,
} from '@/components/hooks';
import { renderDateLabels } from '@/lib/charts';
import { CHART_COLORS } from '@/lib/constants';
import { generateTimeSeries } from '@/lib/date';

export interface EventsChartProps extends BarChartProps {
  websiteId: string;
  focusLabel?: string;
  limit?: number;
}

export function EventsChart({ websiteId, focusLabel, limit }: EventsChartProps) {
  const { timezone } = useTimezone();
  const {
    dateRange: { startDate, endDate, unit },
  } = useDateRange({ timezone: timezone });
  const { locale, dateLocale } = useLocale();
  const { data, isLoading, error } = useWebsiteEventsSeriesQuery(websiteId, { limit });
  const [label, setLabel] = useState<string>(focusLabel);

  const chartData: any = useMemo(() => {
    if (!data) return;

    const map = new Map<string, { x: string; y: number }[]>();

    (data as any[]).forEach(({ x, t, y }) => {
      let series = map.get(x);

      if (!series) {
        series = [];
        map.set(x, series);
      }

      series.push({ x: t, y });
    });

    if (map.size === 0) {
      return {
        datasets: [
          {
            data: generateTimeSeries([], startDate, endDate, unit, dateLocale),
            lineTension: 0,
            borderWidth: 1,
          },
        ],
      };
    } else {
      const datasets = [];
      let index = 0;

      for (const [key, series] of map) {
        const color = colord(CHART_COLORS[index % CHART_COLORS.length]);

        datasets.push({
          label: key,
          data: generateTimeSeries(series, startDate, endDate, unit, dateLocale),
          lineTension: 0,
          backgroundColor: color.alpha(0.6).toRgbString(),
          borderColor: color.alpha(0.7).toRgbString(),
          borderWidth: 1,
        });

        index++;
      }

      return {
        datasets,
        focusLabel,
      };
    }
  }, [data, startDate, endDate, unit, focusLabel, dateLocale]);

  useEffect(() => {
    if (label !== focusLabel) {
      setLabel(focusLabel);
    }
  }, [focusLabel]);

  const renderXLabel = useCallback(renderDateLabels(unit, locale), [unit, locale]);

  return (
    <LoadingPanel isLoading={isLoading} error={error} minHeight="400px">
      {chartData && (
        <BarChart
          chartData={chartData}
          minDate={startDate}
          maxDate={endDate}
          unit={unit}
          stacked={true}
          renderXLabel={renderXLabel}
          height="400px"
        />
      )}
    </LoadingPanel>
  );
}
