import type { QueryFilters } from '@/lib/types';
import { getRealtimeActivity } from '@/queries/sql/getRealtimeActivity';
import { getPageviewStats } from '@/queries/sql/pageviews/getPageviewStats';
import { getSessionStats } from '@/queries/sql/sessions/getSessionStats';

function increment(data: object, key: string) {
  if (key) {
    if (!data[key]) {
      data[key] = 1;
    } else {
      data[key] += 1;
    }
  }
}

export async function getRealtimeData(websiteId: string, filters: QueryFilters) {
  const [activity, pageviews, sessions] = await Promise.all([
    getRealtimeActivity(websiteId, filters),
    getPageviewStats(websiteId, filters),
    getSessionStats(websiteId, filters),
  ]);

  const uniques = new Set<string>();
  const countries: Record<string, number> = {};
  const urls: Record<string, number> = {};
  const referrers: Record<string, number> = {};
  const events: any[] = [];
  let eventCount = 0;

  // activity is newest-first; iterate oldest-first to build the per-session
  // timeline without copying the array (.reverse()) and without a second
  // .filter() pass for eventCount.
  for (let i = activity.length - 1; i >= 0; i--) {
    const event = activity[i];
    const { sessionId, urlPath, referrerDomain, country, eventName } = event;

    if (!uniques.has(sessionId)) {
      uniques.add(sessionId);
      increment(countries, country);
      events.push({ __type: 'session', ...event });
    }

    increment(urls, urlPath);
    increment(referrers, referrerDomain);

    if (eventName) eventCount++;
    events.push({ __type: eventName ? 'event' : 'pageview', ...event });
  }

  let viewsTotal = 0;
  for (const p of pageviews) viewsTotal += Number(p.y) || 0;
  let visitorsTotal = 0;
  for (const s of sessions) visitorsTotal += Number(s.y) || 0;

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
      views: viewsTotal,
      visitors: visitorsTotal,
      events: eventCount,
      countries: Object.keys(countries).length,
    },
    timestamp: Date.now(),
  };
}
