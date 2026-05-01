'use client';
import {
  Column,
  Grid,
  Heading,
  ListItem,
  Row,
  Select,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
} from '@umami/react-zen';
import { colord } from 'colord';
import { useCallback, useMemo, useState } from 'react';
import { BarChart } from '@/components/charts/BarChart';
import { GridRow } from '@/components/common/GridRow';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { Panel } from '@/components/common/Panel';
import { useLocale, useMessages, useResultQuery } from '@/components/hooks';
import { ListTable } from '@/components/metrics/ListTable';
import { MetricLabel } from '@/components/metrics/MetricLabel';
import { PerformanceCard } from '@/components/metrics/PerformanceCard';
import { renderDateLabels } from '@/lib/charts';
import { CHART_COLORS } from '@/lib/constants';
import { generateTimeSeries } from '@/lib/date';
import { formatLongNumber } from '@/lib/format';
import styles from './Performance.module.css';

export interface PerformanceProps {
  websiteId: string;
  startDate: Date;
  endDate: Date;
  unit: string;
}

const METRICS = ['lcp', 'inp', 'cls', 'fcp', 'ttfb'] as const;

const METRIC_LABELS: Record<string, string> = {
  lcp: 'Largest Contentful Paint',
  inp: 'Interaction to Next Paint',
  cls: 'Cumulative Layout Shift',
  fcp: 'First Contentful Paint',
  ttfb: 'Time to First Byte',
};

function formatMetricValue(metric: string, value: number): string {
  if (metric === 'cls') return value.toFixed(3);
  if (value >= 1000) return `${(value / 1000).toFixed(2)} s`;
  return `${Math.round(value)} ms`;
}

const PERCENTILES = [
  { id: 'p50', label: 'p50 — Median' },
  { id: 'p75', label: 'p75 — 75th Percentile' },
  { id: 'p95', label: 'p95 — 95th Percentile' },
] as const;

export function Performance({ websiteId, startDate, endDate, unit }: PerformanceProps) {
  const [selectedMetric, setSelectedMetric] = useState<string>('lcp');
  const [selectedPercentile, setSelectedPercentile] = useState<'p50' | 'p75' | 'p95'>('p75');
  const { t, labels } = useMessages();
  const { locale, dateLocale } = useLocale();

  const { data, error, isLoading } = useResultQuery<any>('performance', {
    websiteId,
    startDate,
    endDate,
    metric: selectedMetric,
  });

  const chartData: any = useMemo(() => {
    if (!data?.chart) return { datasets: [] };

    const p50Color = colord(CHART_COLORS[0]);
    const p75Color = colord(CHART_COLORS[1]);
    const p95Color = colord(CHART_COLORS[2]);
    const series = data.chart.reduce(
      (arr, d: any) => {
        arr.p50.push({ x: d.t, y: Number(d.p50) });
        arr.p75.push({ x: d.t, y: Number(d.p75) });
        arr.p95.push({ x: d.t, y: Number(d.p95) });

        return arr;
      },
      { p50: [], p75: [], p95: [] },
    );

    return {
      datasets: [
        {
          label: 'p50',
          data: generateTimeSeries(series.p50, startDate, endDate, unit, dateLocale),
          type: 'line',
          borderColor: p50Color.alpha(0.8).toRgbString(),
          backgroundColor: p50Color.alpha(0.1).toRgbString(),
          borderWidth: 2,
          fill: false,
          tension: 0.3,
          pointRadius: 2,
        },
        {
          label: 'p75',
          data: generateTimeSeries(series.p75, startDate, endDate, unit, dateLocale),
          type: 'line',
          borderColor: p75Color.alpha(0.8).toRgbString(),
          backgroundColor: p75Color.alpha(0.1).toRgbString(),
          borderWidth: 2,
          fill: false,
          tension: 0.3,
          pointRadius: 2,
        },
        {
          label: 'p95',
          data: generateTimeSeries(series.p95, startDate, endDate, unit, dateLocale),
          type: 'line',
          borderColor: p95Color.alpha(0.8).toRgbString(),
          backgroundColor: p95Color.alpha(0.1).toRgbString(),
          borderWidth: 2,
          fill: false,
          tension: 0.3,
          pointRadius: 2,
        },
      ],
    };
  }, [data, startDate, endDate, unit, dateLocale]);

  const renderXLabel = useCallback(renderDateLabels(unit, locale), [unit, locale]);

  const isCls = selectedMetric === 'cls';
  const metricLabel = t(labels[selectedMetric]) || selectedMetric.toUpperCase();
  const formatListCount = isCls
    ? (n: number) => n.toFixed(3)
    : (n: number) => `${(n / 1000).toFixed(2)} s`;
  const pages = useMemo(
    () => getMetricRows(data?.pages, selectedPercentile),
    [data?.pages, selectedPercentile],
  );
  const pageTitles = useMemo(
    () => getMetricRows(data?.pageTitles, selectedPercentile),
    [data?.pageTitles, selectedPercentile],
  );
  const devices = useMemo(
    () => getMetricRows(data?.devices, selectedPercentile),
    [data?.devices, selectedPercentile],
  );
  const browsers = useMemo(
    () => getMetricRows(data?.browsers, selectedPercentile),
    [data?.browsers, selectedPercentile],
  );

  return (
    <Column gap>
      <Grid columns="280px" gap>
        <Select
          label="Percentile"
          value={selectedPercentile}
          onChange={(value: string) => setSelectedPercentile(value as 'p50' | 'p75' | 'p95')}
        >
          {PERCENTILES.map(({ id, label }) => (
            <ListItem key={id} id={id}>
              {label}
            </ListItem>
          ))}
        </Select>
      </Grid>
      <LoadingPanel data={data} isLoading={isLoading} error={error}>
        {data && (
          <Column gap>
            <Grid columns={{ base: '1fr 1fr', lg: 'repeat(5, 1fr)' }} gap>
              {METRICS.map(metric => (
                <PerformanceCard
                  key={metric}
                  metric={metric}
                  value={Number(data.summary?.[metric]?.[selectedPercentile] || 0)}
                  label={t(labels[metric]) || metric.toUpperCase()}
                  formatValue={(n: number) => formatMetricValue(metric, n)}
                  onClick={() => setSelectedMetric(metric)}
                  selected={selectedMetric === metric}
                />
              ))}
            </Grid>
            <Panel>
              <Column gap="4" padding="4">
                <Row justifyContent="space-between" alignItems="center">
                  <Text weight="bold">{METRIC_LABELS[selectedMetric]}</Text>
                  <Row gap="4">
                    <Text size="sm" className={styles.sampleCount}>
                      {t(labels.sampleSize)}: {formatLongNumber(data.summary?.count || 0)}
                    </Text>
                  </Row>
                </Row>
                <BarChart
                  chartData={chartData}
                  minDate={startDate}
                  maxDate={endDate}
                  unit={unit}
                  renderXLabel={renderXLabel}
                  renderYLabel={(label: string) => {
                    const val = Number(label);
                    if (selectedMetric === 'cls') return val.toFixed(2);
                    if (val >= 1000) return `${(val / 1000).toFixed(2)} s`;
                    return `${Math.round(val)} ms`;
                  }}
                  height="400px"
                />
              </Column>
            </Panel>
            <GridRow layout="two">
              <Panel>
                <Tabs>
                  <Heading size="2xl">{t(labels.pages)}</Heading>
                  <TabList>
                    <Tab id="path">{t(labels.path)}</Tab>
                    <Tab id="title">{t(labels.pageTitle)}</Tab>
                  </TabList>
                  <TabPanel id="path">
                    <ListTable
                      metric={metricLabel}
                      showPercentage={false}
                      formatCount={formatListCount}
                      data={pages}
                      renderLabel={({ label }: { label: string }) => <Text>{label}</Text>}
                    />
                  </TabPanel>
                  <TabPanel id="title">
                    <ListTable
                      metric={metricLabel}
                      showPercentage={false}
                      formatCount={formatListCount}
                      data={pageTitles}
                      renderLabel={(row: any) => <MetricLabel type="title" data={row} />}
                    />
                  </TabPanel>
                </Tabs>
              </Panel>
              <Panel>
                <Tabs>
                  <Heading size="2xl">{t(labels.environment)}</Heading>
                  <TabList>
                    <Tab id="device">{t(labels.device)}</Tab>
                    <Tab id="browser">{t(labels.browser)}</Tab>
                  </TabList>
                  <TabPanel id="device">
                    <ListTable
                      metric={metricLabel}
                      showPercentage={false}
                      formatCount={formatListCount}
                      data={devices}
                      renderLabel={(row: any) => <MetricLabel type="device" data={row} />}
                    />
                  </TabPanel>
                  <TabPanel id="browser">
                    <ListTable
                      metric={metricLabel}
                      showPercentage={false}
                      formatCount={formatListCount}
                      data={browsers}
                      renderLabel={(row: any) => <MetricLabel type="browser" data={row} />}
                    />
                  </TabPanel>
                </Tabs>
              </Panel>
            </GridRow>
          </Column>
        )}
      </LoadingPanel>
    </Column>
  );
}

function getMetricRows(data: any[] | undefined, percentile: 'p50' | 'p75' | 'p95') {
  if (!data) {
    return [];
  }

  const rows = [];

  for (const row of data) {
    const count = Number(row[percentile]);

    if (count > 0) {
      rows.push({ label: row.name, count, percent: 0 });
    }

    if (rows.length >= 20) {
      break;
    }
  }

  return rows;
}
