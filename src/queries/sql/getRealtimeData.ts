import type { QueryFilters } from '@/lib/types';
import { getRealtimeActivity } from '@/queries/sql/getRealtimeActivity';
import { getPageviewStats } from '@/queries/sql/pageviews/getPageviewStats';
import { getSessionStats } from '@/queries/sql/sessions/getSessionStats';

function increment(data: object, key: string) {
  if (key) {
    if (!data[key]) {
      data[key] = 1;
      return true;
    } else {
      data[key] += 1;
    }
  }

  return false;
}

export async function getRealtimeData(websiteId: string, filters: QueryFilters) {
  const [activity, pageviews, sessions] = await Promise.all([
    getRealtimeActivity(websiteId, filters),
    getPageviewStats(websiteId, filters),
    getSessionStats(websiteId, filters),
  ]);

  const uniques = new Set();
  const countries = {};
  const urls = {};
  const referrers = {};
  const events = [];
  let eventCount = 0;
  let countryCount = 0;

  for (let index = activity.length - 1; index >= 0; index--) {
    const event = activity[index];
    const { sessionId, urlPath, referrerDomain, country, eventName } = event;

    if (!uniques.has(sessionId)) {
      uniques.add(sessionId);

      if (increment(countries, country)) {
        countryCount++;
      }

      events.push({ __type: 'session', ...event });
    }

    increment(urls, urlPath);
    increment(referrers, referrerDomain);

    if (eventName) {
      eventCount++;
    }

    events.push({ __type: eventName ? 'event' : 'pageview', ...event });
  }

  return {
    countries,
    urls,
    referrers,
    events: events.reverse(),
    series: {
      views: pageviews,
      visitors: sessions,
    },
    totals: {
      views: pageviews.reduce((sum: number, { y }: { y: number }) => Number(sum) + Number(y), 0),
      visitors: sessions.reduce((sum: number, { y }: { y: number }) => Number(sum) + Number(y), 0),
      events: eventCount,
      countries: countryCount,
    },
    timestamp: Date.now(),
  };
}
