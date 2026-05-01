import {
  Button,
  Column,
  Grid,
  Icon,
  Label,
  ListItem,
  Loading,
  Select,
  TextField,
} from '@umami/react-zen';
import { useMemo, useState } from 'react';
import { Empty } from '@/components/common/Empty';
import { MultiSelect } from '@/components/common/MultiSelect';
import { useFilters, useFormat, useWebsiteValuesQuery } from '@/components/hooks';
import { X } from '@/components/icons';
import { isSearchOperator } from '@/lib/params';

export interface FilterRecordProps {
  websiteId?: string;
  type: string;
  startDate: Date;
  endDate: Date;
  name: string;
  operator: string;
  value: string | string[];
  onSelect?: (name: string, value: any) => void;
  onRemove?: (name: string) => void;
  onChange?: (name: string, value: string) => void;
}

export function FilterRecord({
  websiteId,
  type,
  startDate,
  endDate,
  name,
  operator,
  value,
  onSelect,
  onRemove,
  onChange,
}: FilterRecordProps) {
  const { fields, operators } = useFilters();
  const initValues = Array.isArray(value) ? value : value ? value.split(',') : [];
  const [selected, setSelected] = useState<string[]>(initValues);
  const [search, setSearch] = useState('');
  const { formatValue } = useFormat();
  const { data, isLoading } = useWebsiteValuesQuery({
    websiteId,
    type,
    search,
    startDate,
    endDate,
  });
  const isSearch = isSearchOperator(operator);
  const fieldLabel = useMemo(() => fields.find(f => f.name === name)?.label, [fields, name]);
  const stringOperators = useMemo(
    () => operators.filter(({ type }) => type === 'string'),
    [operators],
  );
  const items = useMemo(() => data?.filter(({ value }) => value) || [], [data]);

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  const handleSelectOperator = (value: any) => {
    onSelect?.(name, value);
  };

  const handleSelectValue = (value: string) => {
    setSelected([value]);
    onChange?.(name, value);
  };

  const handleMultiSelectValue = (values: string[]) => {
    setSelected(values);
    onChange?.(name, values.join(','));
  };

  return (
    <Column>
      <Label>{fieldLabel}</Label>
      <Grid columns="1fr auto" gap>
        <Grid columns={{ base: '1fr', md: '200px 1fr' }} gap>
          <Select value={operator} onChange={handleSelectOperator}>
            {stringOperators.map(({ name, label }: any) => (
              <ListItem key={name} id={name}>
                {label}
              </ListItem>
            ))}
          </Select>
          {isSearch && (
            <TextField
              value={selected[0] || ''}
              defaultValue={selected[0] || ''}
              onChange={handleSelectValue}
            />
          )}
          {!isSearch && (
            <MultiSelect
              value={selected}
              onChange={handleMultiSelectValue}
              searchValue={search}
              onSearch={handleSearch}
              renderValue={values =>
                values.length > 0 ? values.map(v => formatValue(v, type)).join(', ') : undefined
              }
              renderEmptyState={() => (isLoading ? <Loading icon="dots" /> : <Empty />)}
              allowSearch
            >
              {items.map(({ value }) => (
                <ListItem key={value} id={value}>
                  {formatValue(value, type)}
                </ListItem>
              ))}
            </MultiSelect>
          )}
        </Grid>
        <Column justifyContent="flex-start">
          <Button onPress={() => onRemove?.(name)}>
            <Icon>
              <X />
            </Icon>
          </Button>
        </Column>
      </Grid>
    </Column>
  );
}
