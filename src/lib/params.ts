import { FILTER_COLUMNS, OPERATORS } from '@/lib/constants';
import type { Filter, Operator, QueryFilters, QueryOptions } from '@/lib/types';

const OPERATOR_REGEX = new RegExp(`^(${Object.values(OPERATORS).join('|')})\\.(.*)$`);

export function parseFilterValue(param: any) {
  if (typeof param === 'string') {
    const [, operator, value] = param.match(OPERATOR_REGEX) || [];

    const resolvedOperator = operator || OPERATORS.equals;
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

const SUFFIX_DIGITS_RE = /\d+$/;

export function filtersObjectToArray(filters: QueryFilters, options: QueryOptions = {}): Filter[] {
  if (!filters) {
    return [];
  }

  // Push into a single array instead of arr.concat() per key — concat
  // allocates a new array on every iteration, making the helper quadratic
  // in the number of filter keys. parseFilters calls this 2–3× per
  // dashboard query, so the allocation churn adds up.
  const result: Filter[] = [];

  for (const key in filters) {
    const filter = filters[key];

    if (filter === undefined || filter === null) {
      continue;
    }

    const baseName = key.replace(SUFFIX_DIGITS_RE, '');
    const paramName = key !== baseName ? key : undefined;
    const column = options?.columns?.[baseName] ?? FILTER_COLUMNS[baseName];

    if (filter?.name && filter?.value !== undefined) {
      result.push({
        ...filter,
        column,
        paramName: paramName ?? filter.paramName,
      });
      continue;
    }

    const { operator, value } = parseFilterValue(filter);

    result.push({
      name: baseName,
      paramName,
      column,
      operator: operator as Operator,
      value,
      prefix: options?.prefix,
    });
  }

  return result;
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
