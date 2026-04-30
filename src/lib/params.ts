import { FILTER_COLUMNS, OPERATORS } from '@/lib/constants';
import type { Filter, Operator, QueryFilters, QueryOptions } from '@/lib/types';

const OPERATOR_REGEX = new RegExp(`^(${Object.values(OPERATORS).join('|')})\\.(.*)$`);

export function parseFilterValue(param: any) {
  if (typeof param === 'string') {
    const [, operator, value] = param.match(OPERATOR_REGEX) || [];

    const resolvedOperator = (operator || OPERATORS.equals) as Operator;
    const resolvedValue = value ?? param;

    if (resolvedOperator === OPERATORS.equals || resolvedOperator === OPERATORS.notEquals) {
      return { operator: resolvedOperator, value: resolvedValue.split(',') };
    }

    return { operator: resolvedOperator, value: resolvedValue };
  }

  if (Array.isArray(param)) {
    return { operator: OPERATORS.equals, value: param };
  }

  return { operator: OPERATORS.equals, value: [param] };
}

export function isEqualsOperator(operator: any) {
  return [OPERATORS.equals, OPERATORS.notEquals].includes(operator);
}

export function isSearchOperator(operator: any) {
  return [
    OPERATORS.contains,
    OPERATORS.doesNotContain,
    OPERATORS.regex,
    OPERATORS.notRegex,
  ].includes(operator);
}

export function filtersObjectToArray(filters: QueryFilters, options: QueryOptions = {}): Filter[] {
  if (!filters) {
    return [];
  }

  const arr: Filter[] = [];

  for (const key of Object.keys(filters)) {
    const filter = filters[key];

    if (filter === undefined || filter === null) {
      continue;
    }

    const baseName = key.replace(/\d+$/, '');
    const paramName = key !== baseName ? key : undefined;

    if (filter?.name && filter?.value !== undefined) {
      arr.push({
        ...filter,
        column: options?.columns?.[baseName] ?? FILTER_COLUMNS[baseName],
        paramName: paramName ?? filter.paramName,
      });
      continue;
    }

    const { operator, value } = parseFilterValue(filter);

    arr.push({
      name: baseName,
      paramName,
      column: options?.columns?.[baseName] ?? FILTER_COLUMNS[baseName],
      operator,
      value,
      prefix: options?.prefix,
    });
  }

  return arr;
}

export function filtersArrayToObject(filters: Filter[]) {
  const nameCounts: Record<string, number> = {};
  return filters.reduce((obj, filter: Filter) => {
    const { name, operator, value } = filter;
    const count = nameCounts[name] ?? 0;
    const key = count === 0 ? name : `${name}${count}`;
    nameCounts[name] = count + 1;

    obj[key] = `${operator}.${Array.isArray(value) ? value.join(',') : value}`;

    return obj;
  }, {});
}
