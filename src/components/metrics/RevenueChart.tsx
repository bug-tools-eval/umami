import { colord } from 'colord';
import { useCallback, useMemo } from 'react';
import { BarChart } from '@/components/charts/BarChart';
import { useLocale } from '@/components/hooks';
import { renderDateLabels } from '@/lib/charts';
import { CHART_COLORS } from '@/lib/constants';
import { generateTimeSeries } from '@/lib/date';

export interface RevenueChartProps {
  data: { x: string; t: string; y: number; count: number }[];
  unit: string;
  minDate: Date;
  maxDate: Date;
  currency: string;
}

export function RevenueChart({ data, unit, minDate, maxDate, currency }: RevenueChartProps) {
  const { locale, dateLocale } = useLocale();

  const chartData: any = useMemo(() => {
    if (!data?.length) return { datasets: [] };

    const map = new Map<string, { x: string; y: number }[]>();

    data.forEach(({ x, t, y }) => {
      let series = map.get(x);

      if (!series) {
        series = [];
        map.set(x, series);
      }

      series.push({ x: t, y });
    });

    const datasets = [];
    let index = 0;

    for (const [key, series] of map) {
      const color = colord(CHART_COLORS[index % CHART_COLORS.length]);

      datasets.push({
        label: key,
        data: generateTimeSeries(series, minDate, maxDate, unit, dateLocale),
        backgroundColor: color.alpha(0.6).toRgbString(),
        borderColor: color.alpha(0.7).toRgbString(),
        borderWidth: 1,
      });

      index++;
    }

    return {
      datasets,
    };
  }, [data, minDate, maxDate, unit, dateLocale]);

  const renderXLabel = useCallback(renderDateLabels(unit, locale), [unit, locale]);

  return (
    <BarChart
      chartData={chartData}
      unit={unit}
      minDate={minDate}
      maxDate={maxDate}
      currency={currency}
      stacked={true}
      renderXLabel={renderXLabel}
      height="400px"
    />
  );
}
