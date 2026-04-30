import clickhouse from '@/lib/clickhouse';
import { CLICKHOUSE, PRISMA, runQuery } from '@/lib/db';
import prisma from '@/lib/prisma';
import type { QueryFilters } from '@/lib/types';

export interface RetentionParameters {
  startDate: Date;
  endDate: Date;
  timezone?: string;
}

export interface RetentionResult {
  date: string;
  day: number;
  visitors: number;
  returnVisitors: number;
  percentage: number;
}

export async function getRetention(
  ...args: [websiteId: string, parameters: RetentionParameters, filters: QueryFilters]
) {
  return runQuery({
    [PRISMA]: () => relationalQuery(...args),
    [CLICKHOUSE]: () => clickhouseQuery(...args),
  });
}

async function relationalQuery(
  websiteId: string,
  parameters: RetentionParameters,
  filters: QueryFilters,
): Promise<RetentionResult[]> {
  const { startDate, endDate, timezone } = parameters;
  const { getDateSQL, getDayDiffQuery, getCastColumnQuery, rawQuery, parseFilters } = prisma;
  const unit = 'day';

  const { filterQuery, joinSessionQuery, cohortQuery, queryParams } = parseFilters({
    ...filters,
    websiteId,
    startDate,
    endDate,
    timezone,
  });
  const hasQueryFilters = [filterQuery, joinSessionQuery, cohortQuery].some(query => query.trim());

  if (!hasQueryFilters) {
    return rawQuery(
      `
      WITH session_days AS (
        select
          website_event.session_id,
          ${getDateSQL('website_event.created_at', unit, timezone)} as activity_date
        from website_event
        where website_event.website_id = {{websiteId::uuid}}
          and website_event.created_at between {{startDate}} and {{endDate}}
        group by 1, 2
      ),
      cohort_items AS (
        select
          min(activity_date) as cohort_date,
          session_id
        from session_days
        group by session_id
      ),
      cohort_size as (
        select cohort_date,
          count(*) as visitors
        from cohort_items
        group by 1
      ),
      cohort_date as (
        select
          c.cohort_date,
          ${getDayDiffQuery('d.activity_date', 'c.cohort_date')} as day_number,
          count(*) as visitors
        from session_days d
        join cohort_items c
        on d.session_id = c.session_id
        group by 1, 2
      )
      select
        c.cohort_date as date,
        c.day_number as day,
        s.visitors,
        c.visitors as "returnVisitors",
        ${getCastColumnQuery('c.visitors', 'float')} * 100 / s.visitors as percentage
      from cohort_date c
      join cohort_size s
      on c.cohort_date = s.cohort_date
      where c.day_number <= 31
      order by 1, 2`,
      queryParams,
    );
  }

  return rawQuery(
    `
    WITH cohort_items AS (
      select
        min(${getDateSQL('website_event.created_at', unit, timezone)}) as cohort_date,
        website_event.session_id
      from website_event
      ${cohortQuery}
      ${joinSessionQuery}
      where website_event.website_id = {{websiteId::uuid}}
        and website_event.created_at between {{startDate}} and {{endDate}}
        ${filterQuery}
      group by website_event.session_id
    ),
    user_activities AS (
      select distinct
        website_event.session_id,
        ${getDayDiffQuery(getDateSQL('created_at', unit, timezone), 'cohort_items.cohort_date')} as day_number
      from website_event
      join cohort_items
      on website_event.session_id = cohort_items.session_id
      where website_id = {{websiteId::uuid}}
          and created_at between {{startDate}} and {{endDate}}
          
      ),
    cohort_size as (
      select cohort_date,
        count(*) as visitors
      from cohort_items
      group by 1
      order by 1
    ),
    cohort_date as (
      select
        c.cohort_date,
        a.day_number,
        count(*) as visitors
      from user_activities a
      join cohort_items c
      on a.session_id = c.session_id
      group by 1, 2
    )
    select
      c.cohort_date as date,
      c.day_number as day,
      s.visitors,
      c.visitors as "returnVisitors",
      ${getCastColumnQuery('c.visitors', 'float')} * 100 / s.visitors  as percentage
    from cohort_date c
    join cohort_size s
    on c.cohort_date = s.cohort_date
    where c.day_number <= 31
    order by 1, 2`,
    queryParams,
  );
}

async function clickhouseQuery(
  websiteId: string,
  parameters: RetentionParameters,
  filters: QueryFilters,
): Promise<RetentionResult[]> {
  const { startDate, endDate, timezone } = parameters;
  const { getDateSQL, rawQuery, parseFilters } = clickhouse;
  const unit = 'day';

  const { filterQuery, cohortQuery, queryParams } = parseFilters({
    ...filters,
    websiteId,
    startDate,
    endDate,
    timezone,
  });
  const hasQueryFilters = [filterQuery, cohortQuery].some(query => query.trim());

  if (!hasQueryFilters) {
    return rawQuery(
      `
      WITH session_days AS (
        select
          session_id,
          ${getDateSQL('created_at', unit, timezone)} as activity_date
        from website_event
        where website_id = {websiteId:UUID}
          and created_at between {startDate:DateTime64} and {endDate:DateTime64}
        group by session_id, activity_date
      ),
      cohort_items AS (
        select
          min(activity_date) as cohort_date,
          session_id
        from session_days
        group by session_id
      ),
      cohort_size as (
        select cohort_date,
          count(*) as visitors
        from cohort_items
        group by 1
      ),
      cohort_date as (
        select
          c.cohort_date,
          toInt32((d.activity_date - c.cohort_date) / 86400) as day_number,
          count(*) as visitors
        from session_days d
        join cohort_items c
        on d.session_id = c.session_id
        group by 1, 2
      )
      select
        c.cohort_date as date,
        c.day_number as day,
        s.visitors as visitors,
        c.visitors returnVisitors,
        c.visitors * 100 / s.visitors as percentage
      from cohort_date c
      join cohort_size s
      on c.cohort_date = s.cohort_date
      where c.day_number <= 31
      order by 1, 2`,
      queryParams,
    );
  }

  return rawQuery(
    `
    WITH cohort_items AS (
      select
        min(${getDateSQL('created_at', unit, timezone)}) as cohort_date,
        session_id
      from website_event
      ${cohortQuery}
      where website_id = {websiteId:UUID}
        and created_at between {startDate:DateTime64} and {endDate:DateTime64}
        ${filterQuery}
      group by session_id
    ),
    user_activities AS (
      select distinct
        website_event.session_id as session_id,
        toInt32((${getDateSQL('created_at', unit, timezone)} - cohort_items.cohort_date) / 86400) as day_number
      from website_event
      join cohort_items
      on website_event.session_id = cohort_items.session_id
      where website_id = {websiteId:UUID}
        and created_at between {startDate:DateTime64} and {endDate:DateTime64}
    ),
    cohort_size as (
      select cohort_date,
        count(*) as visitors
      from cohort_items
      group by 1
      order by 1
    ),
    cohort_date as (
      select
        c.cohort_date,
        a.day_number,
        count(*) as visitors
      from user_activities a
      join cohort_items c
      on a.session_id = c.session_id
      group by 1, 2
    )
    select
      c.cohort_date as date,
      c.day_number as day,
      s.visitors as visitors,
      c.visitors returnVisitors,
      c.visitors * 100 / s.visitors as percentage
    from cohort_date c
    join cohort_size s
    on c.cohort_date = s.cohort_date
    where c.day_number <= 31
    order by 1, 2`,
    queryParams,
  );
}
