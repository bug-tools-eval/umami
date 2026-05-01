import { Column, Grid, ListItem, Select } from '@umami/react-zen';
import { useMemo, useState } from 'react';
import { PieChart } from '@/components/charts/PieChart';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import {
  useEventDataPropertiesQuery,
  useEventDataValuesQuery,
  useMessages,
} from '@/components/hooks';
import { ListTable } from '@/components/metrics/ListTable';
import { CHART_COLORS } from '@/lib/constants';

export function EventProperties({ websiteId }: { websiteId: string }) {
  const [propertyName, setPropertyName] = useState('');
  const [eventName, setEventName] = useState('');

  const { t, labels } = useMessages();
  const { data, isLoading, isFetching, error } = useEventDataPropertiesQuery(websiteId);

  const { events, propertiesByEvent } = useMemo(() => {
    const events: string[] = [];
    const eventNames = new Set<string>();
    const propertiesByEvent = new Map<string, string[]>();

    data?.forEach(({ eventName, propertyName }) => {
      if (!eventNames.has(eventName)) {
        eventNames.add(eventName);
        events.push(eventName);
      }

      let properties = propertiesByEvent.get(eventName);

      if (!properties) {
        properties = [];
        propertiesByEvent.set(eventName, properties);
      }

      properties.push(propertyName);
    });

    return { events, propertiesByEvent };
  }, [data]);
  const properties = eventName ? propertiesByEvent.get(eventName) || [] : [];

  return (
    <LoadingPanel
      data={data}
      isLoading={isLoading}
      isFetching={isFetching}
      error={error}
      minHeight="300px"
    >
      <Column gap="6">
        {data && (
          <Grid columns="repeat(auto-fill, minmax(300px, 1fr))" marginBottom="3" gap>
            <Select
              label={t(labels.event)}
              value={eventName}
              onChange={setEventName}
              placeholder=""
            >
              {events?.map(p => (
                <ListItem key={p} id={p}>
                  {p}
                </ListItem>
              ))}
            </Select>
            <Select
              label={t(labels.property)}
              value={propertyName}
              onChange={setPropertyName}
              isDisabled={!eventName}
              placeholder=""
            >
              {properties?.map(p => (
                <ListItem key={p} id={p}>
                  {p}
                </ListItem>
              ))}
            </Select>
          </Grid>
        )}
        {eventName && propertyName && (
          <EventValues websiteId={websiteId} eventName={eventName} propertyName={propertyName} />
        )}
      </Column>
    </LoadingPanel>
  );
}

const EventValues = ({ websiteId, eventName, propertyName }) => {
  const {
    data: values,
    isLoading,
    isFetching,
    error,
  } = useEventDataValuesQuery(websiteId, eventName, propertyName);

  const { chartData, tableData } = useMemo(() => {
    if (!propertyName || !values) {
      return { chartData: null, tableData: [] };
    }

    const labels: string[] = [];
    const totals: number[] = [];
    const rows: { label: string; count: number; percent: number }[] = [];
    let propertySum = 0;

    values.forEach(({ value, total }) => {
      labels.push(value);
      totals.push(total);
      rows.push({ label: value, count: total, percent: 0 });
      propertySum += total;
    });

    if (propertySum > 0) {
      rows.forEach(row => {
        row.percent = 100 * (row.count / propertySum);
      });
    } else {
      rows.length = 0;
    }

    return {
      chartData: {
        labels,
        datasets: [
          {
            data: totals,
            backgroundColor: CHART_COLORS,
            borderWidth: 0,
          },
        ],
      },
      tableData: rows,
    };
  }, [propertyName, values]);

  return (
    <LoadingPanel
      isLoading={isLoading}
      isFetching={isFetching}
      data={values}
      error={error}
      minHeight="300px"
      gap="6"
    >
      {values && (
        <Grid columns="1fr 1fr" gap>
          <ListTable title={propertyName} data={tableData} />
          <PieChart type="doughnut" chartData={chartData} />
        </Grid>
      )}
    </LoadingPanel>
  );
};
